const Hue = require('./hue')

class App {
    constructor() {
        this.hue = new Hue(this)
    }

    start() {
        this.receivedEvent('deviceready')

        document.getElementById('quit-button').addEventListener('click', () => {
            window.close()
        })

        var subdomain = app.getSubdomain()
        var display = app.getDisplay()

        var subdomainElement = document.getElementById('subdomain')
        subdomainElement.value = subdomain

        var displayElement = document.getElementById('display')
        displayElement.value = display

        var formElement = document.getElementById('form')
        formElement.setAttribute('style', 'display:block')

        form.addEventListener("submit", (event) => {
            event.preventDefault()
            event.stopPropagation()
            subdomain = this.setSubdomain(subdomainElement.value)
            display = this.setDisplay(displayElement.value)
            if (subdomain && display) {
                this.load(subdomain, display)
            }
        })

        if (subdomain && display) {
            this.load(subdomain, display)
        }
    }

    receivedEvent(id, parentId) {
        var parentElement = document.getElementById(parentId || 'status-bar')
        var eventElements = parentElement.querySelectorAll('.event')
        eventElements.forEach(function (element) {
            element.setAttribute('style', 'display:none')
        })

        var receivedElement = parentElement.querySelector('.' + id)

        receivedElement.setAttribute('style', 'display:block')

        console.log('Received Event: ' + id)
    }

    receivedHueEvent(id) {
        this.receivedEvent(id, 'hue-status-bar')
    }

    getSubdomain() {
        return window.localStorage.getItem('subdomain')
    }

    setSubdomain(subdomain) {
        window.localStorage.setItem('subdomain', subdomain)
        return subdomain
    }

    getDisplay() {
        return window.localStorage.getItem('display')
    }

    setDisplay(display) {
        display = parseInt(display, 0)
        window.localStorage.setItem('display', display)
        return display
    }

    visit(url, transform) {
        this.receivedEvent('loading')
        // url = `http://192.168.1.165:3001/displays/${app.getDisplay()}`
        const {x, y, scale} = transform
        const iframe = document.createElement('IFRAME')

        var clicks = 0, timeout = null

        iframe.addEventListener('load', () => {
            iframe.contentWindow.addEventListener('click', () => {
                if (clicks === 0) {
                    clicks = 1
                } else if (timeout) {
                    clicks += 1
                } else {
                    timeout = window.setTimeout(() => {}, 1000)
                }
                if (clicks === 5) {
                    const el = document.getElementById('iframe')
                    el.classList.remove('visible')
                    el.removeChild(el.firstChild)
                    document.getElementById('exhibit-access').style.display = "block"
                    clicks = 0
                    this.hue.turnAllOff()
                }
            })

        })

        iframe.src = url
        document.getElementById('exhibit-access').style.display = "none"
        const removeIframe = () => {
            if (iframe.contentDocument) {
                const classList = iframe.contentDocument.body.classList
                const rootEl = iframe.contentDocument.getElementById('root')
                if (classList.contains('rails-default-error-page') || classList.contains('exhibit-access-eject')) {
                    document.getElementById('iframe').removeChild(iframe)
                    document.getElementById('iframe').classList.remove('visible')
                    document.getElementById('exhibit-access').style.display = "block"
                    this.receivedEvent('deviceready')
                }
                if (rootEl && rootEl.innerHTML === '') {
                    iframe.src = url
                }
            }
        }
        window.setTimeout(removeIframe, 1000)
        window.setInterval(removeIframe, 10000)
        document.getElementById('iframe').innerHTML = ''
        document.getElementById('iframe').classList.add('visible')
        document.getElementById('iframe').appendChild(iframe)
        window.scrollTo(0,0)
    }

    load(subdomain, display) {
        var url = `https://${subdomain}.exhibitaccess.com/displays/${display}`
        // var url = `http://192.168.1.165:3001/displays/${display}`

        var request = new XMLHttpRequest()
        request.addEventListener("load", () => {
            console.log(request.responseText)
            console.log(request.status)
            if (request.responseText.match(/ready/)) {
                const json = JSON.parse(request.responseText)
                console.log("Preflight check successful - now going there.")
                this.visit(url, json)
            } else {
                console.log("Server and/or display is not available.")
                this.receivedEvent('invalid')
            }
        })
        request.addEventListener("error", (errors) => {
            console.log("Errors got in the way.")
            console.log(errors)
            this.receivedEvent('unavailable')
        })
        request.open("GET", `${url}/configuration`)
        request.send()
    }

}

window.app = new App()
app.start()
