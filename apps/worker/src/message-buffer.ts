import { Buffer } from 'node:buffer'

export class MessageBuffer {
  private buffer: Buffer = Buffer.alloc(0)

  async handleData(
    newData: Buffer,
    messageHandler: (message: Buffer) => Promise<void>
  ): Promise<void> {
    this.buffer = Buffer.concat([this.buffer, newData])

    while (this.buffer.length > 0) {
      // Not enough data for message header, waiting for more
      if (this.buffer.length < 5) {
        break
      }

      const messageLength = this.buffer.readUInt32BE(1) - 4 // Length includes itself, so subtract 4

      const totalMessageLength = messageLength + 5 // type (1) + length (4) + content

      // Incomplete message, waiting for more data
      if (this.buffer.length < totalMessageLength) {
        break
      }

      const message = this.buffer.slice(0, totalMessageLength)

      await messageHandler(message)

      this.buffer = this.buffer.slice(totalMessageLength)
    }
  }
}
