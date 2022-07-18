var Module=typeof Module!=='undefined'?Module:{}; let moduleOverrides={}; let key; for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key]=Module[key];
  }
} let arguments_=[]; let thisProgram='./this.program'; let quit_=function(status, toThrow) {
  throw toThrow;
}; const ENVIRONMENT_IS_WEB=typeof window==='object'; const ENVIRONMENT_IS_WORKER=typeof importScripts==='function'; const ENVIRONMENT_IS_NODE=typeof process==='object'&&typeof process.versions==='object'&&typeof process.versions.node==='string'; let scriptDirectory=''; function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  } return scriptDirectory+path;
} let read_; let readAsync; let readBinary; let setWindowTitle; function logExceptionOnExit(e) {
  if (e instanceof ExitStatus) return; const toLog=e; err('exiting due to exception: '+toLog);
} let nodeFS; let nodePath; if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory=require('path').dirname(scriptDirectory)+'/';
  } else {
    scriptDirectory=__dirname+'/';
  }read_=function shell_read(filename, binary) {
    if (!nodeFS)nodeFS=require('fs'); if (!nodePath)nodePath=require('path'); filename=nodePath['normalize'](filename); return nodeFS['readFileSync'](filename, binary?null:'utf8');
  }; readBinary=function readBinary(filename) {
    let ret=read_(filename, true); if (!ret.buffer) {
      ret=new Uint8Array(ret);
    }assert(ret.buffer); return ret;
  }; readAsync=function readAsync(filename, onload, onerror) {
    if (!nodeFS)nodeFS=require('fs'); if (!nodePath)nodePath=require('path'); filename=nodePath['normalize'](filename); nodeFS['readFile'](filename, function(err, data) {
      if (err)onerror(err); else onload(data.buffer);
    });
  }; if (process['argv'].length>1) {
    thisProgram=process['argv'][1].replace(/\\/g, '/');
  }arguments_=process['argv'].slice(2); if (typeof module!=='undefined') {
    module['exports']=Module;
  }process['on']('uncaughtException', function(ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  }); process['on']('unhandledRejection', function(reason) {
    throw reason;
  }); quit_=function(status, toThrow) {
    if (keepRuntimeAlive()) {
      process['exitCode']=status; throw toThrow;
    }logExceptionOnExit(toThrow); process['exit'](status);
  }; Module['inspect']=function() {
    return '[Emscripten Module object]';
  };
} else if (ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory=self.location.href;
  } else if (typeof document!=='undefined'&&document.currentScript) {
    scriptDirectory=document.currentScript.src;
  } if (scriptDirectory.indexOf('blob:')!==0) {
    scriptDirectory=scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/')+1);
  } else {
    scriptDirectory='';
  } {read_=function(url) {
    const xhr=new XMLHttpRequest; xhr.open('GET', url, false); xhr.send(null); return xhr.responseText;
  }; if (ENVIRONMENT_IS_WORKER) {
    readBinary=function(url) {
      const xhr=new XMLHttpRequest; xhr.open('GET', url, false); xhr.responseType='arraybuffer'; xhr.send(null); return new Uint8Array(xhr.response);
    };
  }readAsync=function(url, onload, onerror) {
    const xhr=new XMLHttpRequest; xhr.open('GET', url, true); xhr.responseType='arraybuffer'; xhr.onload=function() {
      if (xhr.status==200||xhr.status==0&&xhr.response) {
        onload(xhr.response); return;
      }onerror();
    }; xhr.onerror=onerror; xhr.send(null);
  };}setWindowTitle=function(title) {
    document.title=title;
  };
} else {} const out=Module['print']||console.log.bind(console); var err=Module['printErr']||console.warn.bind(console); for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key]=moduleOverrides[key];
  }
}moduleOverrides=null; if (Module['arguments'])arguments_=Module['arguments']; if (Module['thisProgram'])thisProgram=Module['thisProgram']; if (Module['quit'])quit_=Module['quit']; function convertJsFunctionToWasm(func, sig) {
  if (typeof WebAssembly.Function==='function') {
    const typeNames={'i': 'i32', 'j': 'i64', 'f': 'f32', 'd': 'f64'}; const type={parameters: [], results: sig[0]=='v'?[]:[typeNames[sig[0]]]}; for (var i=1; i<sig.length; ++i) {
      type.parameters.push(typeNames[sig[i]]);
    } return new WebAssembly.Function(type, func);
  } let typeSection=[1, 0, 1, 96]; const sigRet=sig.slice(0, 1); const sigParam=sig.slice(1); const typeCodes={'i': 127, 'j': 126, 'f': 125, 'd': 124}; typeSection.push(sigParam.length); for (var i=0; i<sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  } if (sigRet=='v') {
    typeSection.push(0);
  } else {
    typeSection=typeSection.concat([1, typeCodes[sigRet]]);
  }typeSection[1]=typeSection.length-2; const bytes=new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0].concat(typeSection, [2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0])); const module=new WebAssembly.Module(bytes); const instance=new WebAssembly.Instance(module, {'e': {'f': func}}); const wrappedFunc=instance.exports['f']; return wrappedFunc;
} const freeTableIndexes=[]; let functionsInTableMap; function getEmptyTableSlot() {
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop();
  } try {
    wasmTable.grow(1);
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err;
    } throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
  } return wasmTable.length-1;
} function updateTableMap(offset, count) {
  for (let i=offset; i<offset+count; i++) {
    const item=getWasmTableEntry(i); if (item) {
      functionsInTableMap.set(item, i);
    }
  }
} function addFunction(func, sig) {
  if (!functionsInTableMap) {
    functionsInTableMap=new WeakMap; updateTableMap(0, wasmTable.length);
  } if (functionsInTableMap.has(func)) {
    return functionsInTableMap.get(func);
  } const ret=getEmptyTableSlot(); try {
    setWasmTableEntry(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    } const wrapped=convertJsFunctionToWasm(func, sig); setWasmTableEntry(ret, wrapped);
  }functionsInTableMap.set(func, ret); return ret;
} let wasmBinary; if (Module['wasmBinary'])wasmBinary=Module['wasmBinary']; const noExitRuntime=Module['noExitRuntime']||true; if (typeof WebAssembly!=='object') {
  abort('no native wasm support detected');
} let wasmMemory; let ABORT=false; let EXITSTATUS; function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: '+text);
  }
} function getCFunc(ident) {
  const func=Module['_'+ident]; assert(func, 'Cannot call unknown function '+ident+', make sure it is exported'); return func;
} function ccall(ident, returnType, argTypes, args, opts) {
  const toC={'string': function(str) {
    let ret=0; if (str!==null&&str!==undefined&&str!==0) {
      const len=(str.length<<2)+1; ret=stackAlloc(len); stringToUTF8(str, ret, len);
    } return ret;
  }, 'array': function(arr) {
    const ret=stackAlloc(arr.length); writeArrayToMemory(arr, ret); return ret;
  }}; function convertReturnValue(ret) {
    if (returnType==='string') return UTF8ToString(ret); if (returnType==='boolean') return Boolean(ret); return ret;
  } const func=getCFunc(ident); const cArgs=[]; let stack=0; if (args) {
    for (let i=0; i<args.length; i++) {
      const converter=toC[argTypes[i]]; if (converter) {
        if (stack===0)stack=stackSave(); cArgs[i]=converter(args[i]);
      } else {
        cArgs[i]=args[i];
      }
    }
  } let ret=func.apply(null, cArgs); function onDone(ret) {
    if (stack!==0)stackRestore(stack); return convertReturnValue(ret);
  }ret=onDone(ret); return ret;
} function cwrap(ident, returnType, argTypes, opts) {
  argTypes=argTypes||[]; const numericArgs=argTypes.every(function(type) {
    return type==='number';
  }); const numericRet=returnType!=='string'; if (numericRet&&numericArgs&&!opts) {
    return getCFunc(ident);
  } return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  };
} const UTF8Decoder=typeof TextDecoder!=='undefined'?new TextDecoder('utf8'):undefined; function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  idx>>>=0; const endIdx=idx+maxBytesToRead; let endPtr=idx; while (heap[endPtr>>>0]&&!(endPtr>=endIdx))++endPtr; if (endPtr-idx>16&&heap.subarray&&UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx>>>0, endPtr>>>0));
  } else {
    var str=''; while (idx<endPtr) {
      let u0=heap[idx++>>>0]; if (!(u0&128)) {
        str+=String.fromCharCode(u0); continue;
      } const u1=heap[idx++>>>0]&63; if ((u0&224)==192) {
        str+=String.fromCharCode((u0&31)<<6|u1); continue;
      } const u2=heap[idx++>>>0]&63; if ((u0&240)==224) {
        u0=(u0&15)<<12|u1<<6|u2;
      } else {
        u0=(u0&7)<<18|u1<<12|u2<<6|heap[idx++>>>0]&63;
      } if (u0<65536) {
        str+=String.fromCharCode(u0);
      } else {
        const ch=u0-65536; str+=String.fromCharCode(55296|ch>>10, 56320|ch&1023);
      }
    }
  } return str;
} function UTF8ToString(ptr, maxBytesToRead) {
  ptr>>>=0; return ptr?UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead):'';
} function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  outIdx>>>=0; if (!(maxBytesToWrite>0)) return 0; const startIdx=outIdx; const endIdx=outIdx+maxBytesToWrite-1; for (let i=0; i<str.length; ++i) {
    let u=str.charCodeAt(i); if (u>=55296&&u<=57343) {
      const u1=str.charCodeAt(++i); u=65536+((u&1023)<<10)|u1&1023;
    } if (u<=127) {
      if (outIdx>=endIdx) break; heap[outIdx++>>>0]=u;
    } else if (u<=2047) {
      if (outIdx+1>=endIdx) break; heap[outIdx++>>>0]=192|u>>6; heap[outIdx++>>>0]=128|u&63;
    } else if (u<=65535) {
      if (outIdx+2>=endIdx) break; heap[outIdx++>>>0]=224|u>>12; heap[outIdx++>>>0]=128|u>>6&63; heap[outIdx++>>>0]=128|u&63;
    } else {
      if (outIdx+3>=endIdx) break; heap[outIdx++>>>0]=240|u>>18; heap[outIdx++>>>0]=128|u>>12&63; heap[outIdx++>>>0]=128|u>>6&63; heap[outIdx++>>>0]=128|u&63;
    }
  }heap[outIdx>>>0]=0; return outIdx-startIdx;
} function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
} function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer>>>0);
} function alignUp(x, multiple) {
  if (x%multiple>0) {
    x+=multiple-x%multiple;
  } return x;
} let buffer; let HEAP8; let HEAPU8; let HEAP16; let HEAPU16; let HEAP32; let HEAPU32; let HEAPF32; let HEAPF64; function updateGlobalBufferAndViews(buf) {
  buffer=buf; Module['HEAP8']=HEAP8=new Int8Array(buf); Module['HEAP16']=HEAP16=new Int16Array(buf); Module['HEAP32']=HEAP32=new Int32Array(buf); Module['HEAPU8']=HEAPU8=new Uint8Array(buf); Module['HEAPU16']=HEAPU16=new Uint16Array(buf); Module['HEAPU32']=HEAPU32=new Uint32Array(buf); Module['HEAPF32']=HEAPF32=new Float32Array(buf); Module['HEAPF64']=HEAPF64=new Float64Array(buf);
} const INITIAL_MEMORY=Module['INITIAL_MEMORY']||1073741824; let wasmTable; const __ATPRERUN__=[]; const __ATINIT__=[]; const __ATPOSTRUN__=[]; let runtimeInitialized=false; const runtimeKeepaliveCounter=0; function keepRuntimeAlive() {
  return noExitRuntime||runtimeKeepaliveCounter>0;
} function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun']=='function')Module['preRun']=[Module['preRun']]; while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }callRuntimeCallbacks(__ATPRERUN__);
} function initRuntime() {
  runtimeInitialized=true; callRuntimeCallbacks(__ATINIT__);
} function postRun() {
  if (Module['postRun']) {
    if (typeof Module['postRun']=='function')Module['postRun']=[Module['postRun']]; while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }callRuntimeCallbacks(__ATPOSTRUN__);
} function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
} function addOnInit(cb) {
  __ATINIT__.unshift(cb);
} function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
} let runDependencies=0; let runDependencyWatcher=null; let dependenciesFulfilled=null; function addRunDependency(id) {
  runDependencies++; if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
} function removeRunDependency(id) {
  runDependencies--; if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  } if (runDependencies==0) {
    if (runDependencyWatcher!==null) {
      clearInterval(runDependencyWatcher); runDependencyWatcher=null;
    } if (dependenciesFulfilled) {
      const callback=dependenciesFulfilled; dependenciesFulfilled=null; callback();
    }
  }
}Module['preloadedImages']={}; Module['preloadedAudios']={}; function abort(what) {
  {if (Module['onAbort']) {
    Module['onAbort'](what);
  }}what='Aborted('+what+')'; err(what); ABORT=true; EXITSTATUS=1; what+='. Build with -s ASSERTIONS=1 for more info.'; const e=new WebAssembly.RuntimeError(what); throw e;
} const dataURIPrefix='data:application/octet-stream;base64,'; function isDataURI(filename) {
  return filename.startsWith(dataURIPrefix);
} function isFileURI(filename) {
  return filename.startsWith('file://');
} let wasmBinaryFile; wasmBinaryFile='kernel.wasm'; if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile=locateFile(wasmBinaryFile);
} function getBinary(file) {
  try {
    if (file==wasmBinaryFile&&wasmBinary) {
      return new Uint8Array(wasmBinary);
    } if (readBinary) {
      return readBinary(file);
    } else {
      throw 'both async and sync fetching of the wasm failed';
    }
  } catch (err) {
    abort(err);
  }
} function getBinaryPromise() {
  if (!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch==='function'&&!isFileURI(wasmBinaryFile)) {
      return fetch(wasmBinaryFile, {credentials: 'same-origin'}).then(function(response) {
        if (!response['ok']) {
          throw 'failed to load wasm binary file at \''+wasmBinaryFile+'\'';
        } return response['arrayBuffer']();
      }).catch(function() {
        return getBinary(wasmBinaryFile);
      });
    } else {
      if (readAsync) {
        return new Promise(function(resolve, reject) {
          readAsync(wasmBinaryFile, function(response) {
            resolve(new Uint8Array(response));
          }, reject);
        });
      }
    }
  } return Promise.resolve().then(function() {
    return getBinary(wasmBinaryFile);
  });
} function createWasm() {
  const info={'a': asmLibraryArg}; function receiveInstance(instance, module) {
    const exports=instance.exports; Module['asm']=exports; wasmMemory=Module['asm']['g']; updateGlobalBufferAndViews(wasmMemory.buffer); wasmTable=Module['asm']['y']; addOnInit(Module['asm']['h']); removeRunDependency('wasm-instantiate');
  }addRunDependency('wasm-instantiate'); function receiveInstantiationResult(result) {
    receiveInstance(result['instance']);
  } function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(function(instance) {
      return instance;
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: '+reason); abort(reason);
    });
  } function instantiateAsync() {
    if (!wasmBinary&&typeof WebAssembly.instantiateStreaming==='function'&&!isDataURI(wasmBinaryFile)&&!isFileURI(wasmBinaryFile)&&typeof fetch==='function') {
      return fetch(wasmBinaryFile, {credentials: 'same-origin'}).then(function(response) {
        const result=WebAssembly.instantiateStreaming(response, info); return result.then(receiveInstantiationResult, function(reason) {
          err('wasm streaming compile failed: '+reason); err('falling back to ArrayBuffer instantiation'); return instantiateArrayBuffer(receiveInstantiationResult);
        });
      });
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult);
    }
  } if (Module['instantiateWasm']) {
    try {
      const exports=Module['instantiateWasm'](info, receiveInstance); return exports;
    } catch (e) {
      err('Module.instantiateWasm callback failed with error: '+e); return false;
    }
  }instantiateAsync(); return {};
} function callRuntimeCallbacks(callbacks) {
  while (callbacks.length>0) {
    const callback=callbacks.shift(); if (typeof callback=='function') {
      callback(Module); continue;
    } const func=callback.func; if (typeof func==='number') {
      if (callback.arg===undefined) {
        getWasmTableEntry(func)();
      } else {
        getWasmTableEntry(func)(callback.arg);
      }
    } else {
      func(callback.arg===undefined?null:callback.arg);
    }
  }
} const wasmTableMirror=[]; function getWasmTableEntry(funcPtr) {
  let func=wasmTableMirror[funcPtr]; if (!func) {
    if (funcPtr>=wasmTableMirror.length)wasmTableMirror.length=funcPtr+1; wasmTableMirror[funcPtr]=func=wasmTable.get(funcPtr);
  } return func;
} function setWasmTableEntry(idx, func) {
  wasmTable.set(idx, func); wasmTableMirror[idx]=func;
} function ___cxa_allocate_exception(size) {
  return _malloc(size+16)+16;
} function ExceptionInfo(excPtr) {
  this.excPtr=excPtr; this.ptr=excPtr-16; this.set_type=function(type) {
    HEAP32[this.ptr+4>>>2]=type;
  }; this.get_type=function() {
    return HEAP32[this.ptr+4>>>2];
  }; this.set_destructor=function(destructor) {
    HEAP32[this.ptr+8>>>2]=destructor;
  }; this.get_destructor=function() {
    return HEAP32[this.ptr+8>>>2];
  }; this.set_refcount=function(refcount) {
    HEAP32[this.ptr>>>2]=refcount;
  }; this.set_caught=function(caught) {
    caught=caught?1:0; HEAP8[this.ptr+12>>>0]=caught;
  }; this.get_caught=function() {
    return HEAP8[this.ptr+12>>>0]!=0;
  }; this.set_rethrown=function(rethrown) {
    rethrown=rethrown?1:0; HEAP8[this.ptr+13>>>0]=rethrown;
  }; this.get_rethrown=function() {
    return HEAP8[this.ptr+13>>>0]!=0;
  }; this.init=function(type, destructor) {
    this.set_type(type); this.set_destructor(destructor); this.set_refcount(0); this.set_caught(false); this.set_rethrown(false);
  }; this.add_ref=function() {
    const value=HEAP32[this.ptr>>>2]; HEAP32[this.ptr>>>2]=value+1;
  }; this.release_ref=function() {
    const prev=HEAP32[this.ptr>>>2]; HEAP32[this.ptr>>>2]=prev-1; return prev===1;
  };
} let exceptionLast=0; let uncaughtExceptionCount=0; function ___cxa_throw(ptr, type, destructor) {
  const info=new ExceptionInfo(ptr); info.init(type, destructor); exceptionLast=ptr; uncaughtExceptionCount++; throw ptr;
} function _abort() {
  abort('');
} function _emscripten_memcpy_big(dest, src, num) {
  HEAPU8.copyWithin(dest>>>0, src>>>0, src+num>>>0);
} function emscripten_realloc_buffer(size) {
  try {
    wasmMemory.grow(size-buffer.byteLength+65535>>>16); updateGlobalBufferAndViews(wasmMemory.buffer); return 1;
  } catch (e) {}
} function _emscripten_resize_heap(requestedSize) {
  const oldSize=HEAPU8.length; requestedSize=requestedSize>>>0; const maxHeapSize=4294901760; if (requestedSize>maxHeapSize) {
    return false;
  } for (let cutDown=1; cutDown<=4; cutDown*=2) {
    let overGrownHeapSize=oldSize*(1+.2/cutDown); overGrownHeapSize=Math.min(overGrownHeapSize, requestedSize+100663296); const newSize=Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536)); const replacement=emscripten_realloc_buffer(newSize); if (replacement) {
      return true;
    }
  } return false;
} function _gettimeofday(ptr) {
  const now=Date.now(); HEAP32[ptr>>>2]=now/1e3|0; HEAP32[ptr+4>>>2]=now%1e3*1e3|0; return 0;
} var asmLibraryArg={'f': ___cxa_allocate_exception, 'e': ___cxa_throw, 'b': _abort, 'c': _emscripten_memcpy_big, 'd': _emscripten_resize_heap, 'a': _gettimeofday}; const asm=createWasm(); var ___wasm_call_ctors=Module['___wasm_call_ctors']=function() {
  return (___wasm_call_ctors=Module['___wasm_call_ctors']=Module['asm']['h']).apply(null, arguments);
}; var _checkUsageTimeBomb=Module['_checkUsageTimeBomb']=function() {
  return (_checkUsageTimeBomb=Module['_checkUsageTimeBomb']=Module['asm']['i']).apply(null, arguments);
}; var _decode=Module['_decode']=function() {
  return (_decode=Module['_decode']=Module['asm']['j']).apply(null, arguments);
}; var _updateValueTree=Module['_updateValueTree']=function() {
  return (_updateValueTree=Module['_updateValueTree']=Module['asm']['k']).apply(null, arguments);
}; var _sortContextTreeByMetricIdx=Module['_sortContextTreeByMetricIdx']=function() {
  return (_sortContextTreeByMetricIdx=Module['_sortContextTreeByMetricIdx']=Module['asm']['l']).apply(null, arguments);
}; var _getMetricDesJsonStr=Module['_getMetricDesJsonStr']=function() {
  return (_getMetricDesJsonStr=Module['_getMetricDesJsonStr']=Module['asm']['m']).apply(null, arguments);
}; var _getSourceFileJsonStr=Module['_getSourceFileJsonStr']=function() {
  return (_getSourceFileJsonStr=Module['_getSourceFileJsonStr']=Module['asm']['n']).apply(null, arguments);
}; var _getClickNodeMessage=Module['_getClickNodeMessage']=function() {
  return (_getClickNodeMessage=Module['_getClickNodeMessage']=Module['asm']['o']).apply(null, arguments);
}; var _updateSourceFileExistStatus=Module['_updateSourceFileExistStatus']=function() {
  return (_updateSourceFileExistStatus=Module['_updateSourceFileExistStatus']=Module['asm']['p']).apply(null, arguments);
}; var _getJsonStrSize=Module['_getJsonStrSize']=function() {
  return (_getJsonStrSize=Module['_getJsonStrSize']=Module['asm']['q']).apply(null, arguments);
}; var _setFunctionFilter=Module['_setFunctionFilter']=function() {
  return (_setFunctionFilter=Module['_setFunctionFilter']=Module['asm']['r']).apply(null, arguments);
}; var _setUpDrawFlameGraph=Module['_setUpDrawFlameGraph']=function() {
  return (_setUpDrawFlameGraph=Module['_setUpDrawFlameGraph']=Module['asm']['s']).apply(null, arguments);
}; var _drawFlameGraphClickNode=Module['_drawFlameGraphClickNode']=function() {
  return (_drawFlameGraphClickNode=Module['_drawFlameGraphClickNode']=Module['asm']['t']).apply(null, arguments);
}; var _getContextName=Module['_getContextName']=function() {
  return (_getContextName=Module['_getContextName']=Module['asm']['u']).apply(null, arguments);
}; var _getContextDetails=Module['_getContextDetails']=function() {
  return (_getContextDetails=Module['_getContextDetails']=Module['asm']['v']).apply(null, arguments);
}; var _getTreeTableList=Module['_getTreeTableList']=function() {
  return (_getTreeTableList=Module['_getTreeTableList']=Module['asm']['w']).apply(null, arguments);
}; var _getTreeTableChildrenList=Module['_getTreeTableChildrenList']=function() {
  return (_getTreeTableChildrenList=Module['_getTreeTableChildrenList']=Module['asm']['x']).apply(null, arguments);
}; var _malloc=Module['_malloc']=function() {
  return (_malloc=Module['_malloc']=Module['asm']['z']).apply(null, arguments);
}; var stackSave=Module['stackSave']=function() {
  return (stackSave=Module['stackSave']=Module['asm']['A']).apply(null, arguments);
}; var stackRestore=Module['stackRestore']=function() {
  return (stackRestore=Module['stackRestore']=Module['asm']['B']).apply(null, arguments);
}; var stackAlloc=Module['stackAlloc']=function() {
  return (stackAlloc=Module['stackAlloc']=Module['asm']['C']).apply(null, arguments);
}; Module['ccall']=ccall; Module['cwrap']=cwrap; Module['addFunction']=addFunction; let calledRun; function ExitStatus(status) {
  this.name='ExitStatus'; this.message='Program terminated with exit('+status+')'; this.status=status;
}dependenciesFulfilled=function runCaller() {
  if (!calledRun)run(); if (!calledRun)dependenciesFulfilled=runCaller;
}; function run(args) {
  args=args||arguments_; if (runDependencies>0) {
    return;
  }preRun(); if (runDependencies>0) {
    return;
  } function doRun() {
    if (calledRun) return; calledRun=true; Module['calledRun']=true; if (ABORT) return; initRuntime(); if (Module['onRuntimeInitialized'])Module['onRuntimeInitialized'](); postRun();
  } if (Module['setStatus']) {
    Module['setStatus']('Running...'); setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1); doRun();
    }, 1);
  } else {
    doRun();
  }
}Module['run']=run; if (Module['preInit']) {
  if (typeof Module['preInit']=='function')Module['preInit']=[Module['preInit']]; while (Module['preInit'].length>0) {
    Module['preInit'].pop()();
  }
}run();
