process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const { v3: { discovery, api } } = require('node-hue-api')

class Hue {
    constructor(ui) {
        this.ui = ui
        this.enabled = window.localStorage.getItem('hue_enabled')
        this.username = window.localStorage.getItem('hue_username')
        this.clientkey = window.localStorage.getItem('hue_clientkey')

        this.btn = document.getElementById('toggle-hue-bridge')

        if (this.isEnabled) {
            this.start().then(() => {
                this.buildLightPanel()
            })
            this.btn.innerText = 'Disable Hue Lighting'
        } else {
            this.btn.innerText = 'Enable Hue Lighting'
        }

        this.btn.addEventListener('click', () => {
            if (this.isEnabled) {
                this.disable()
                this.btn.innerText = 'Enable Hue Lighting'
            } else {
                this.enable()
                this.btn.innerText = 'Disable Hue Lighting'
            }
        })
    }

    get isEnabled() {
        return this.enabled === 'on'
    }

    enable() {
        this.enabled = 'on'
        window.localStorage.setItem('hue_enabled', 'on')
        this.start().then(() => {
            this.buildLightPanel()
        })
    }

    disable() {
        delete this.api
        delete this.enabled
        delete this.ip
        window.localStorage.setItem('hue_enabled', 'off')
        document.getElementById('light-panel').innerHTML = ''
        this.ui.receivedHueEvent('')
    }

    async getIpAddress() {
        const results = await discovery.nupnpSearch()
        if (!results.length) {
            console.error("Report a failure!")
            return null
        } else {
            return results[0].ipaddress
        }
    }

    async start() {
        try {
            this.ui.receivedHueEvent('listening')
            const ip = await this.getIpAddress()
            if (ip) {
                this.ip = ip
                this.ui.receivedHueEvent('loading')
                if (this.username) {
                    return await this.connect(ip)
                } else {
                    const unauthenticatedApi = await api.createLocal(ip).connect()
                    const user = await unauthenticatedApi.users.createUser('exhibitaccess', 'exhibitaccess')
                    if (user) {
                        console.log(user)
                        this.username = user.username
                        this.clientkey = user.clientkey
                        window.localStorage.setItem('hue_username', this.username)
                        window.localStorage.setItem('hue_clientkey', this.clientkey)
                        return await this.connect(ip)
                    } else {
                        console.log("Unable to create user. Did you push the blue button on the bridge?")
                        this.ui.receivedHueEvent('unavailable')
                    }
                }
            } else {
                console.error("No Hue For You!")
                this.ui.receivedHueEvent('unavailable')
            }
        } catch (e) {
            if (e.message && e.message.match(/pressed/)) {
                this.ui.receivedHueEvent('pressme')
                window.setTimeout(this.start.bind(this), 30000)
            } else {
                console.error(e)
            }
        }
    }

    async connect(ip) {
        try {
            this.api = await api.createLocal(ip).connect(this.username)
            this.ui.receivedHueEvent('deviceready')
            return this.api
        } catch (e){
            console.error(e)
            // TODO: can we detect what kind of error, and erase the creds conditionally
            // TODO: consider sending errors to Airbrake
            this.ui.receivedHueEvent('unavailable')
            return null
            // window.localStorage.setItem('hue_username', null)
            // window.localStorage.setItem('hue_clientkey', null)
            // return this.start()
        }
    }

    withEachLight(fn) {
        this.api.lights.getAll().then(lights => {
            lights.forEach(light => {
                fn(light)
            })
        })
    }

    turnAllOn() {
        if (!this.api) return
        this.withEachLight((light) => {
            this.api.lights.setLightState(light.id, { on: true })
        })
    }

    turnAllOff() {
        if (!this.api) return
        this.withEachLight((light) => {
            this.api.lights.setLightState(light.id, { on: false })
        })
    }

    buildLightPanel() {
        const lp = document.getElementById('light-panel')
        const newLp = document.createElement('DIV')
        newLp.id = 'light-panel'
        this.withEachLight((light) => {
            const el = document.createElement('DIV')
            el.innerHTML = `<h3>ID: ${light.id}</h3><p>${light.name}</p>`
            el.addEventListener('click', () => this.toggleLight(light))
            el.className = light.state.on ? 'on' : 'off'
            newLp.appendChild(el)
        })
        lp.parentNode.replaceChild(newLp, lp)
    }

    toggleLight(light) {
        console.log('toggle light', light.id, light.state)
        this.api.lights.setLightState(light.id, { on: !light.state.on }).then(() => {
            this.buildLightPanel()
        })
    }
}

module.exports = Hue
