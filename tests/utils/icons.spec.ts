import { describe, expect, it } from 'vitest'
import { mdiKick } from '@/utils/icons'

function pathPoints(path: string): [number, number][] {
  const points: [number, number][] = []
  let x = 0
  let y = 0
  for (const [, cmd, args] of path.matchAll(/([MmHhVvz])([^MmHhVvz]*)/g)) {
    const values = args.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
    if (cmd === 'M') [x, y] = values
    else if (cmd === 'm') [x, y] = [x + values[0], y + values[1]]
    else if (cmd === 'H') x = values[0]
    else if (cmd === 'h') x += values[0]
    else if (cmd === 'V') y = values[0]
    else if (cmd === 'v') y += values[0]
    if (cmd !== 'z') points.push([x, y])
  }
  return points
}

describe('icons.ts', () => {
  it('Render the Kick icon filling the 3 to 21 box', () => {
    const points = pathPoints(mdiKick)
    const xs = points.map(([x]) => x)
    const ys = points.map(([, y]) => y)
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([3, 21, 3, 21])
  })

  it('Render the Kick icon symmetric between the top and the bottom', () => {
    const points = pathPoints(mdiKick).map(([x, y]) => `${x},${y}`)
    const mirrored = pathPoints(mdiKick).map(([x, y]) => `${x},${24 - y}`)
    expect(new Set(mirrored)).toEqual(new Set(points))
  })
})
