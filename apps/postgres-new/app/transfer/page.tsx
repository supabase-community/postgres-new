'use client'

import '../../lib/transfer/sender'
import { getIndexedDB } from '../../lib/transfer/sender'

export default function Page() {
  console.log('got in transfer?')
  return <div onClick={() => getIndexedDB()}>Hello</div>
}
