import type { YGOProTest } from 'ygopro-jstest';
import { YGOProMsgHint } from 'ygopro-msg-encode';

export function expectCurrentMessage(
  test: YGOProTest,
  msgClass: any,
  assert?: (msg: any) => void,
) {
  const currentMessages = test.currentMessages;
  const msg = currentMessages.find((m) => m instanceof msgClass);
  if (!msg) {
    throw new Error(`Expected message of type ${msgClass.name}`);
  }
  if (assert) {
    assert(msg);
  }
}

export function expectCurrentMessages(test: YGOProTest, ...msgClasses: any[]) {
  const currentMessages = test.currentMessages;
  for (const msgClass of msgClasses) {
    const found = currentMessages.some((m) => m instanceof msgClass);
    if (!found) {
      throw new Error(`Expected message of type ${msgClass.name}`);
    }
  }
}

export function expectCurrentMessageMatching(
  test: YGOProTest,
  msgClass: any,
  expected: Partial<any>,
) {
  const currentMessages = test.currentMessages;
  const msg = currentMessages.find((m) => m instanceof msgClass);
  if (!msg) {
    throw new Error(`Expected message of type ${msgClass.name}`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if ((msg as any)[key] !== value) {
      throw new Error(
        `Expected ${key} to be ${value}, got ${(msg as any)[key]}`,
      );
    }
  }
}

export function expectCurrentHint(
  test: YGOProTest,
  assert: (msg: YGOProMsgHint) => void,
) {
  const currentMessages = test.currentMessages;
  const hintMsg = currentMessages.find((m) => m instanceof YGOProMsgHint);
  if (!hintMsg) {
    throw new Error('Expected hint message');
  }
  assert(hintMsg);
}
