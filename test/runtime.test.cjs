const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const vm = require('node:vm')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

// Capture the actual module class, substituting only the host-facing SDK boundary.
// HTTP, the COEX dependency, module lifecycle and action callbacks remain real.
function loadModule() {
	const filename = path.resolve(__dirname, '../main.js')
	const realRequire = createRequire(filename)
	let ModuleClass
	class InstanceBase {
		log() {}
		updateStatus(status) {
			this.status = status
		}
		setActionDefinitions(actions) {
			this.actions = actions
		}
		setFeedbackDefinitions(feedbacks) {
			this.feedbacks = feedbacks
		}
		setVariableDefinitions(variables) {
			this.variables = variables
		}
	}
	const sdk = realRequire('@companion-module/base')
	vm.runInNewContext(
		fs.readFileSync(filename, 'utf8'),
		{
			require: (id) =>
				id === '@companion-module/base'
					? {
							...sdk,
							InstanceBase,
							runEntrypoint: (factory) => {
								ModuleClass = factory
							},
						}
					: realRequire(id),
			console,
		},
		{ filename },
	)
	return new ModuleClass({})
}

async function until(predicate) {
	const end = Date.now() + 3000
	while (!predicate()) {
		if (Date.now() > end) throw new Error('Timed out waiting for module HTTP activity')
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
}

test('COEX HTTP actions, source discovery, config reload, error status and lifecycle', async (t) => {
	const requests = []
	let locked = false
	const server = http.createServer(async (req, res) => {
		let body = ''
		for await (const chunk of req) body += chunk
		requests.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null })
		res.setHeader('Content-Type', 'application/json')
		let data = {}
		if (req.url.endsWith('/input/sources'))
			data = [{ name: 'HDMI 1', groupId: 7, supportFrameRate: '50|60', supportResolution: '1920x1080' }]
		if (req.url.endsWith('/preset')) data = [{ name: 'Show $(literal:value)', sequenceNumber: 3 }]
		res.end(JSON.stringify(locked ? { code: 1, message: 'device locked' } : { code: 0, data }))
	})
	await new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(8001, '0.0.0.0', resolve)
	})
	t.after(() => new Promise((resolve) => server.close(resolve)))
	const instance = loadModule()
	await instance.init({ host: '127.0.0.1', port: 8001 })
	await until(() => instance.actions)
	assert.equal(instance.status, 'ok')
	assert.deepEqual(JSON.parse(JSON.stringify(instance.actions.source.options[0].choices)), [
		{ id: 'HDMI 1', label: 'HDMI 1' },
	])
	assert.equal(Object.keys(instance.feedbacks).length, 0)
	assert.equal(instance.variables.length, 0)
	const cases = [
		['source', { num: 'HDMI 1' }, 'screen/input', { groupId: 7 }],
		['brightness', { num: 75 }, 'cabinet/brightness', { ratio: 0.75, idList: [16777215] }],
		['display_mode', { num: 2 }, 'screen/displaymode', { value: 2 }],
		['blackout', {}, 'screen/displaymode', { value: 1 }],
		['normal', {}, 'screen/displaymode', { value: 0 }],
		['freeze', {}, 'screen/displaymode', { value: 2 }],
		['gamma', { num: 2.8, type: 3 }, 'cabinet/gamma', { value: 2.8, type: 3, idList: [16777215] }],
		['colortemp', { num: 6500 }, 'cabinet/colortemperature', { value: 6500, idList: [16777215] }],
		// Already prepared host text must reach the dependency unchanged, including literal variable syntax.
		['preset', { preset: 'Show $(literal:value)' }, 'currentpreset', { sequenceNumber: 3 }],
		['workingmode', { mode: 3 }, 'hw/mode', { value: 3 }],
		[
			'testpattern',
			{ mode: 16, red: 1, green: 2, blue: 3, gray: 4, gridWidth: 5, moveSpeed: 6, gradientStretch: 7 },
			'screen/controller/pattern/test',
			{
				mode: 16,
				parameters: { red: 1, green: 2, blue: 3, gray: 4, gridWidth: 5, moveSpeed: 6, gradientStretch: 7, state: 1 },
			},
		],
	]
	for (const [id, options, endpoint, body] of cases) {
		const start = requests.length
		await instance.actions[id].callback({ options })
		await until(() => requests.slice(start).some((r) => r.method === 'PUT'))
		assert.deepEqual(
			requests.slice(start).find((r) => r.method === 'PUT'),
			{ method: 'PUT', url: '/api/v1/device/' + endpoint, body },
		)
	}
	const previous = instance.novastar
	const previousActions = instance.actions
	await instance.configUpdated({ host: '127.0.0.1', port: 8001 })
	assert.notEqual(instance.novastar, previous)
	await until(() => instance.actions !== previousActions)
	assert.equal(instance.status, 'ok')
	locked = true
	await instance.configUpdated({ host: '127.0.0.1', port: 8001 })
	await until(() => instance.status === 'connection_failure')
	locked = false
	await instance.configUpdated({ host: '127.0.0.1', port: 8001 })
	await until(() => instance.status === 'ok')
	await instance.destroy()
	const blank = loadModule()
	await blank.init({})
	assert.equal(blank.actions, undefined)
	await blank.destroy()
})
