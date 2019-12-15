import mouse from 'creepyface/dist/observables/mouse'
import finger from 'creepyface/dist/observables/finger'
import combined from 'creepyface/dist/observables/combined'
import observable, {
  Observer
} from 'creepyface/dist/observables/util/observable'
import {
  rotate,
  getAngle,
  diff,
  add,
  sign,
  Vector
} from 'creepyface/dist/util/algebra'
import raf, { cancel } from 'raf'
import now from 'present'
import creepyface from 'creepyface'

type Creepyface = typeof creepyface
declare global {
  interface Window {
    creepyface?: Creepyface
  }
}

export const rand = (x: number) => Math.floor(Math.random() * x)
export const sum = (x: number, y: number) => x + y
export const square = (x: number) => x * x
export const norm = (v: Vector) => Math.sqrt(v.map(square).reduce(sum, 0))
export const times = (v: Vector, n: number) => v.map(x => x * n)

function loop (fn: (time: number) => void) {
  let last = now()
  let handle = raf(function update () {
    let current = now()
    fn(Math.min(current - last, 500))
    last = current
    handle = raf(update)
  })
  return () => cancel(handle)
}

function firefly (props: { onMove: (position: Vector) => void }) {
  let firefly = {
    destination: [window.innerWidth / 2, window.innerHeight / 2],
    position: [rand(window.innerWidth), rand(window.innerHeight)],
    vspeed: [0.3, 0.3]
  }

  const node = document.createElement('img')
  document.body.appendChild(node)
  node.src = `https://creepyface.io/firefly.png`
  node.style.zIndex = '1000'
  node.style.position = 'fixed'
  node.style.width = '3em'

  const subscription = combined([mouse, finger]).subscribe(
    destination => (firefly.destination = destination)
  )

  const cancel = loop(dt => {
    const { destination, position, vspeed } = firefly
    const direction = diff(destination, position)
    let angle = getAngle(direction) - getAngle(vspeed)

    if (Math.abs(angle) > 180) angle -= sign(angle) * 360

    const turnSpeed = 270 / 1000
    const newVspeed = rotate(
      vspeed,
      sign(angle) * Math.min(dt * turnSpeed, Math.abs(angle))
    )
    if (norm(direction) > 10) {
      firefly.position = add(position, times(newVspeed, dt))
      firefly.vspeed = newVspeed

      node.style.left = `${firefly.position[0]}px`
      node.style.top = `${firefly.position[1]}px`
      node.style.transform = `rotate(${getAngle(firefly.vspeed) + 90}deg)`

      props.onMove(firefly.position)
    } else {
      firefly.destination = [window.innerWidth, window.innerHeight]
        .map(n => n - 200)
        .map(rand)
        .map(n => n + 100)
    }
  })

  return () => {
    cancel()
    subscription.unsubscribe()
    node.remove()
  }
}

export default function register (creepyface: Creepyface) {
  let observers: Observer<Vector>[] = []
  let cancel = () => {}
  creepyface.registerPointSource(
    'firefly',
    observable<Vector>(observer => {
      if (observers.length === 0) {
        cancel = firefly({
          onMove: position => observers.map(observer => observer.next(position))
        })
      }
      observers = [...observers, observer]
      return () => {
        observers = observers.filter(o => o !== observer)
        if (observers.length === 0) {
          cancel()
        }
      }
    })
  )
}

if (window.creepyface) {
  register(window.creepyface)
}
