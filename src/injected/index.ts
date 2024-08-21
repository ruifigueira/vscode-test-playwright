import { MessageRequestDataMap, MessageResponseDataMap, RequestMessage, VSCodeHandleObject } from 'src/protocol';
import * as vscode from 'vscode';
import { WebSocket } from 'ws';

export function run() {
  const port = parseInt(process.env.PW_VSCODE_TEST_PORT, 10);
  console.log(`listening port ${port}`);
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    function send<K extends keyof MessageResponseDataMap>(op: K, id: number | undefined, data?: MessageResponseDataMap[K]) {
      ws.send(JSON.stringify({ op, id, data }));
    }

    let lastObjectId = 0;
    const objectsById = new Map<number, any>([[0, vscode]]);
    const idByObjects = new Map<any, number>([[vscode, 0]]);
    const eventEmitters = new Map<number, vscode.Disposable & { listenerCount: number }>();

    function emit(objectId: number, event: any) {
      if (eventEmitters.get(objectId)?.listenerCount)
        send('dispatchEvent', undefined, { objectId, event });
    }

    function fromParam(param: any): any {
      if (['string', 'number', 'boolean', 'null', 'undefined'].includes(typeof param))
        return param;
      if (param.__vscodeHandle)
        return objectsById.get(param.objectId);
      if (Array.isArray(param))
        return param.map(fromParam);
      return Object.fromEntries(Object.entries(param).map(([k, v]) => [k, fromParam(v)]));
    }

    ws.on('message', async json => {
      const { op, id, data } = JSON.parse(json.toString()) as RequestMessage;
      const { objectId } = data;

      switch (op) {
        case 'release': {
          const obj = objectsById.get(objectId);
          if (obj !== undefined) {
            objectsById.delete(objectId);
            idByObjects.delete(obj);
            eventEmitters.get(objectId)?.dispose();
            eventEmitters.delete(objectId);
          }
          send('release', id);
          return;
        }
        case 'registerEvent': {
          const event = eventEmitters.get(objectId);
          if (event)
            event.listenerCount++;
          send('registerEvent', id);
          return;
        }
        case 'unregisterEvent': {
          const event = eventEmitters.get(objectId);
          if (event && event.listenerCount > 0)
            event.listenerCount--;
          send('unregisterEvent', id);
          return;
        }
        case 'invokeMethod': {
          const { fn, params, returnHandle } = data as MessageRequestDataMap['invokeMethod'];
          let result;
          let error;
          try {
            const context = !objectId ? vscode : objectsById.get(objectId);
            if (!context)
              throw new Error(`No object with ID ${objectId} found`);
            const func = new Function(`return ${fn}`)();
            result = await func(context, ...fromParam(params));
            if (returnHandle) {
              let objectId = idByObjects.get(result);
              if (objectId === undefined) {
                objectId = ++lastObjectId;
                objectsById.set(objectId, result);
                idByObjects.set(result, objectId);
                if (result instanceof vscode.EventEmitter) {
                  const { dispose } = result.event(e => emit(objectId, e));
                  eventEmitters.set(objectId, { dispose, listenerCount: 0 });
                  result = { __vscodeHandle: 'eventEmitter', objectId } satisfies VSCodeHandleObject;
                } else {
                  result = { __vscodeHandle: true, objectId } satisfies VSCodeHandleObject;
                }
              }
            }
          } catch (e) {
            error = {
              message: e.message ?? e.toString(),
              stack: e.stack
            };
          }
          send('invokeMethod', id, { result, error });
          return;
        }
      }
    });
    ws.on('error', reject);
    ws.on('close', resolve);
  });
}
