export class SmoothScroller {
  private animationFrame?: number
  private startTime?: number
  private startPos?: number
  private endPos?: number
  private duration?: number
  private cancelled: boolean = false
  private initialDuration?: number

  constructor(private element: HTMLElement) {}

  public scrollTo(to: number, duration: number): Promise<void> {
    if (duration === 0) {
      this.element.scrollTo({
        top: to,
      })
      return Promise.resolve()
    }

    const currentScrollTop = this.element.scrollTop
    const currentTime = performance.now()

    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame)
    }

    // If an animation is already running, calculate the current position and progress
    if (
      this.startTime !== undefined &&
      this.startPos !== undefined &&
      this.endPos !== undefined &&
      this.initialDuration !== undefined
    ) {
      const timeElapsed = currentTime - this.startTime
      const progress = Math.min(timeElapsed / this.initialDuration, 1)
      const easing = this.easeInOutQuad(progress)
      this.startPos = this.startPos + (this.endPos - this.startPos) * easing
      this.duration = (1 - progress) * duration
    } else {
      // Otherwise, start a new animation from the current scroll position
      this.startPos = currentScrollTop
      this.duration = duration
    }

    this.endPos = to
    this.startTime = currentTime
    this.initialDuration = duration
    this.cancelled = false

    return new Promise((resolve) => {
      this.animationFrame = requestAnimationFrame((time) => this.animate(resolve, time))
    })
  }

  public get isAnimating() {
    return this.animationFrame !== undefined
  }

  public cancel() {
    this.cancelled = true
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame)
    }
    this.reset()
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  private animate = (resolve: () => void, currentTime: number) => {
    if (
      this.cancelled ||
      this.startTime === undefined ||
      this.startPos === undefined ||
      this.endPos === undefined ||
      this.duration === undefined ||
      this.initialDuration === undefined
    ) {
      return
    }

    const timeElapsed = currentTime - this.startTime
    const progress = Math.min(timeElapsed / this.initialDuration, 1)
    const easing = this.easeInOutQuad(progress)
    const currentPos = this.startPos + (this.endPos - this.startPos) * easing

    this.element.scrollTop = currentPos

    if (progress < 1) {
      this.animationFrame = requestAnimationFrame((time) => this.animate(resolve, time))
    } else {
      this.reset()
      resolve()
    }
  }

  private reset() {
    this.animationFrame = undefined
    this.startTime = undefined
    this.startPos = undefined
    this.endPos = undefined
    this.duration = undefined
    this.initialDuration = undefined
  }
}
