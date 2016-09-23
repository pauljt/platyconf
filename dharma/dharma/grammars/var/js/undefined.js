var o = null;
var websocket;

var Platform = (function () {
  var version, webkitVersion, platform = {};

  var userAgent = (navigator.userAgent).toLowerCase();
  var language = navigator.language || navigator.browserLanguage;

  version = platform.version = (userAgent.match(/.*(?:rv|chrome|webkit|opera|ie)[\/: ](.+?)([ \);]|$)/) || [])[1];
  webkitVersion = (userAgent.match(/webkit\/(.+?) /) || [])[1];
  platform.windows = platform.isWindows = !!/windows/.test(userAgent);
  platform.mac = platform.isMac = !!/macintosh/.test(userAgent) || (/mac os x/.test(userAgent) && !/like mac os x/.test(userAgent));
  platform.lion = platform.isLion = !!(/mac os x 10_7/.test(userAgent) && !/like mac os x 10_7/.test(userAgent));
  platform.iPhone = platform.isiPhone = !!/iphone/.test(userAgent);
  platform.iPod = platform.isiPod = !!/ipod/.test(userAgent);
  platform.iPad = platform.isiPad = !!/ipad/.test(userAgent);
  platform.iOS = platform.isiOS = platform.iPhone || platform.iPod || platform.iPad;
  platform.android = platform.isAndroid = !!/android/.test(userAgent);
  platform.opera = /opera/.test(userAgent) ? version : 0;
  platform.isOpera = !!platform.opera;
  platform.msie = /msie/.test(userAgent) && !platform.opera ? version : 0;
  platform.isIE = !!platform.msie;
  platform.isIE8OrLower = !!(platform.msie && parseInt(platform.msie, 10) <= 8);
  platform.mozilla = /mozilla/.test(userAgent) && !/(compatible|webkit|msie)/.test(userAgent) ? version : 0;
  platform.isMozilla = !!platform.mozilla;
  platform.webkit = /webkit/.test(userAgent) ? webkitVersion : 0;
  platform.isWebkit = !!platform.webkit;
  platform.chrome = /chrome/.test(userAgent) ? version : 0;
  platform.isChrome = !!platform.chrome;
  platform.mobileSafari = /apple.*mobile/.test(userAgent) && platform.iOS ? webkitVersion : 0;
  platform.isMobileSafari = !!platform.mobileSafari;
  platform.iPadSafari = platform.iPad && platform.isMobileSafari ? webkitVersion : 0;
  platform.isiPadSafari = !!platform.iPadSafari;
  platform.iPhoneSafari = platform.iPhone && platform.isMobileSafari ? webkitVersion : 0;
  platform.isiPhoneSafari = !!platform.iphoneSafari;
  platform.iPodSafari = platform.iPod && platform.isMobileSafari ? webkitVersion : 0;
  platform.isiPodSafari = !!platform.iPodSafari;
  platform.isiOSHomeScreen = platform.isMobileSafari && !/apple.*mobile.*safari/.test(userAgent);
  platform.safari = platform.webkit && !platform.chrome && !platform.iOS && !platform.android ? webkitVersion : 0;
  platform.isSafari = !!platform.safari;
  platform.language = language.split("-", 1)[0];
  platform.current =
    platform.msie ? "msie" :
      platform.mozilla ? "mozilla" :
        platform.chrome ? "chrome" :
          platform.safari ? "safari" :
            platform.opera ? "opera" :
              platform.mobileSafari ? "mobile-safari" :
                platform.android ? "android" : "unknown";

  function platformName(candidates) {
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] in window) {
        return "window." + candidates[i];
      }
      if (candidates[i] in navigator) {
        return "navigator." + candidates[i];
      }
    }
    return undefined;
  }

  platform.GUM = platformName(['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia', 'msGetUserMedia', 'getGUM']);
  platform.PeerConnection = platformName(['webkitRTCPeerConnection', 'mozRTCPeerConnection', 'msPeerConnection']);
  platform.IceCandidate = platformName(['mozRTCIceCandidate', 'RTCIceCandidate']);
  platform.SessionDescription = platformName(['mozRTCSessionDescription', 'RTCSessionDescription']);
  platform.URL = platformName(['URL', 'webkitURL']);
  platform.AudioContext = platformName(['AudioContext', 'webkitAudioContext']);
  platform.OfflineAudioContext = platformName(['OfflineAudioContext', 'webkitOfflineAudioContext']);
  platform.MediaSource = platformName(["MediaSource", "WebKitMediaSource"]);

  function findWebGLContextName(candidates) {
    var canvas = document.createElement("canvas");
    for (var i=0; i<candidates.length; i++) {
      var name = candidates[i];
      try {
        if (canvas.getContext(name)) {
          return name;
        }
      } catch (e) {}
    }
    return null;
  }

  platform.WebGL = "webgl";//findWebGLContextName(["webgl", "experimental-webgl", "webkit-3d"]);
  platform.WebGL2 = "webgl2";//findWebGLContextName(["webgl2", "experimental-webgl2"]);

  platform.captureStreamUntilEnded = "captureStreamUntilEnded";
  if (platform.isMozilla) { platform.captureStreamUntilEnded = "mozCaptureStreamUntilEnded"; }

  platform.srcObject = "srcObject";
  if (platform.isMozilla) { platform.srcObject = "mozSrcObject"; }

  return platform;
})();


var Logger = (function () {
  var color = { red: "\033[1;31m", green: "\033[1;32m", clear: "\033[0m" };
  if (Platform.isWindows) {
    color = { red: "", green: "", clear: ""};
  }
  var sep = "\n/* ### NEXT TESTCASE ############################## */";

  function console(msg) {
    if (websocket) {
      websocket.send(msg);
    }
    if (typeof window == 'undefined') {
      print(msg);
    } else if (window.dump) {
      window.dump(msg);
    } else if (window.console && window.console.log) {
      window.console.log(msg);
    } else {
      throw "Unable to run console logger.";
    }
  }

  function dump(msg) { console(msg); }

  function testcase(msg) { dump("/*L*/ " + JSON.stringify(msg) + "\n"); }

  function dumpln(msg) { dump(msg + "\n"); }

  function error(msg) { dumpln(color.red + msg + color.clear); }

  function JSError(msg) { error(comment(msg)) }

  function comment(msg) { return "/* " + msg + " */"; }

  function separator() { dumpln(color.green + sep + color.clear); }

  return {
    console: console,
    dump: dump,
    error: error,
    JSError: JSError,
    dumpln: dumpln,
    comment: comment,
    testcase: testcase,
    separator: separator
  };
})();


function MersenneTwister(seed) {
  var N = 624, M = 397;
  var MATRIX_A = 0x9908b0df;
  var UPPER_MASK = 0x80000000;
  var LOWER_MASK = 0x7fffffff;
  var mt = new Array(N);
  var mti = N + 1;

  function unsigned32(n1) {
    return n1 < 0 ? (n1 ^ UPPER_MASK) + UPPER_MASK : n1;
  }

  function addition32(n1, n2) {
    return unsigned32((n1 + n2) & 0xffffffff)
  }

  function multiplication32(n1, n2) {
    var sum = 0;
    for (var i = 0; i < 32; ++i) {
      if ((n1 >>> i) & 0x1) {
        sum = addition32(sum, unsigned32(n2 << i));
      }
    }
    return sum;
  }

  function init_genrand(s) {
    mt[0] = unsigned32(s & 0xffffffff);
    for (mti = 1; mti < N; mti++) {
      mt[mti] = multiplication32(69069, mt[ mti - 1]);
      mt[mti] = unsigned32(mt[mti] & 0xffffffff);
    }
  }

  this.genrand_uint32 = function (max) {
    var y;
    var mag01 = [0x0, MATRIX_A];
    if (mti >= N) {
      var kk;
      if (mti == N + 1)
        init_genrand(seed);
      for (kk = 0; kk < N - M; kk++) {
        y = unsigned32((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK));
        mt[kk] = unsigned32(mt[kk + M] ^ (y >>> 1) ^ mag01[y & 0x1]);
      }
      for (; kk < N - 1; kk++) {
        y = unsigned32((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK));
        mt[kk] = unsigned32(mt[kk + ( M - N)] ^ (y >>> 1) ^ mag01[y & 0x1]);
      }
      y = unsigned32((mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK));
      mt[N - 1] = unsigned32(mt[M - 1] ^ (y >>> 1) ^ mag01[y & 0x1]);
      mti = 0;
    }
    y = mt[mti++];
    y = unsigned32(y ^ (y >>> 11));
    y = unsigned32(y ^ ((y << 7) & 0x9d2c5680));
    y = unsigned32(y ^ ((y << 15) & 0xefc60000));
    y = unsigned32(y ^ (y >>> 18));
    return max ? y % max : y;
  };

  this.genrand_real1 = function () {
    return this.genrand_uint32() * (1.0 / 4294967295.0);
  };
}


var Random = {
  seed: null,
  twister: null,

  init: function (seed) {
    if (seed == null || seed === undefined) {
      this.seed = new Date().getTime();
    } else {
      this.seed = seed;
    }
    try {
      this.twister = new MersenneTwister(this.seed);
    } catch (ReferenceError) {
      this.twister = null;
      this.seed = -1;
    }
  },
  number: function (limit) {
    if (limit == 0) {
      return limit;
    }
    if (limit == null || limit === undefined) {
      limit = 0xffffffff;
    }
    if (!this.twister) {
      return Math.floor(Math.random() * limit);
    } else {
      return this.twister.genrand_uint32(limit);
    }
  },
  float: function () {
    if (!this.twister) {
      return Math.random();
    } else {
      return this.twister.genrand_real1();
    }
  },
  range: function (start, limit) {
    if (isNaN(start) || isNaN(limit)) {
      Utils.traceback();
      throw new TypeError("Random.range() received a non number type: '" + start + "', '" + limit + "')");
    }
    if (!this.twister) {
      return Math.floor(Math.random() * (limit - start + 1) + start);
    } else {
      return Math.floor(this.twister.genrand_real1() * (limit - start + 1) + start);
    }
  },
  index: function (list) {
    if (list == null || list === undefined || !(list instanceof Array)) {
      Utils.traceback();
      throw new TypeError("Random.index() received a non array type: '" + list + "'");
    }
    return list[this.number(list.length)];
  },
  key: function (obj) {
    var list = [];
    for (var i in obj) {
      list.push(i);
    }
    return this.index(list);
  },
  bool: function () {
    return this.index([true, false]);
  },
  pick: function (obj) {
    if (obj == null || obj === undefined) {
      return null;
    }
    if (typeof(obj) == "function") {
      return obj(); //this.pick(obj());
    }
    if (typeof(obj) == "string") {
      return obj;
    }
    if (obj instanceof(Array)) {
      obj = this.pick(this.index(obj));
    }
    return obj;
  },
  chance: function (limit) {
    if (limit == null || limit === undefined) {
      limit = 2;
    }
    if (isNaN(limit)) {
      Utils.traceback();
      throw new TypeError("Random.chance() received a non number type: '" + limit + "'");
    }
    return this.number(limit) == 1;
  },
  choose: function (list, flat) {
    if (list == null || list === undefined || !(list instanceof Array)) {
      Utils.traceback();
      throw new TypeError("Random.choose() received a non-array type: '" + list + "'");
    }
    var total = 0, i;
    for (i = 0; i < list.length; i++) {
      total += list[i][0];
    }
    var n = this.number(total);
    for (i = 0; i < list.length; i++) {
      if (n < list[i][0]) {
        if (flat == true) {
          return list[i][1];
        } else {
          return this.pick([list[i][1]]);
        }
      }
      n = n - list[i][0];
    }
    if (flat == true) {
      return list[0][1];
    }
    return this.pick([list[0][1]]);
  },
  some: function (list, limit) {
    if (list == null || list === undefined || !(list instanceof Array)) {
      Utils.traceback();
      throw new TypeError("Random.some() received a non-array type: '" + list + "'");
    }
    if (limit == null || limit === undefined) {
      limit = this.range(0, list.length);
    }
    var result = [];
    for (var i = 0; i < limit; i++) {
      result.push(this.pick(list));
    }
    return result;
  },
  use: function (obj) {
    return Random.bool() ? obj : "";
  }
};


function Objects() {
  this.counter = 0;
  this.container = {};
}

Objects.prototype.add = function (category, member) {
  member = member ? member : "o" + this.counter;
  if (!this.has(category)) {
    this.container[category] = [];
  }
  this.container[category].push({type: category, name: member});
  ++this.counter;
  return this.container[category].slice(-1)[0].name;
};

Objects.prototype.get = function (category, last) {
  if (!(category in this.container)) {
    //return {type:null, name:null};
    Utils.traceback();
    throw new Error(category + " is not available.");
  }
  if (last) {
    return this.container[category].slice(-1)[0];
  }
  return Random.index(this.container[category]);
};

Objects.prototype.pick = function (category, last) {
  try {
    return this.get(category, last).name;
  } catch (e) {
    Utils.traceback();
    throw Logger.JSError("Error: pick(" + category + ") " + category + " is undefined.");
  }
};

Objects.prototype.pop = function (objectName) {
  var self = this;
  Utils.getKeysFromHash(this.container).forEach(function (category) {
    self.container[category].forEach(function (obj) {
      if (obj.name == objectName) {
        self.container[category].splice(self.container[category].indexOf(obj), 1);
      }
    });
  });
};

Objects.prototype.contains = function (categoryNames) {
  var categories = [], self = this;
  categoryNames.forEach(function (name) {
    if (self.has(name)) {
      categories.push(name);
    }
  });
  return (categories.length == 0) ? null : categories;
};

Objects.prototype.show = function (category) {
  return (category in this.container) ? this.container[category] : this.container;
};

Objects.prototype.count = function (category) {
  return (category in this.container) ? this.container[category].length : 0;
};

Objects.prototype.has = function (category) {
  if (category in this.container) {
    this.check(category);
    return !!(this.container[category].length > 0);
  }
  return false;
};

Objects.prototype.valid = function () {
  var items = [], self = this;
  Utils.getKeysFromHash(self.container).forEach(function (category) {
    self.check(category);
  });
  Utils.getKeysFromHash(self.container).forEach(function (category) {
    for (var i = 0; i < self.container[category].length; i++) {
      items.push(self.container[category][i].name);
    }
  });
  return items;
};

Objects.prototype.check = function (category) {
  var self = this;
  self.container[category].forEach(function (object) {
    try {
      var x = /*frame.contentWindow.*/eval(object.name);
      if (x === undefined || x == null) {
        self.pop(object.name);
      }
    } catch (e) {
      self.pop(object.name);
    }
  });
};


var Make = {
  bool: function () { return Random.bool(); },
  float: function () {
    var n;
    if (Random.chance(32)) {
      switch(Random.number(4)) {
        case 0: n = Random.range(Number.MAX_VALUE, Number.MIN_VALUE); break;
        case 1: n = Math.pow(10, 1) / Math.pow(10, Random.number(307)); break;
        case 2: n = Math.pow(2, Random.float() * Random.float() * 64); break;
        case 3: n = Math.pow(10, Random.range(1, 9)) / Math.pow(10, Random.range(1, 9)); break;
      }
      return n;
    }
    switch (Random.number(6)) {
      default: n = Random.float();
    }
    return n;
  },
  rangeNumber: function () {
    return Random.pick([1, 2, 3, 4, 6, 8, 16, 32, 64, Make.tinyNumber]);
  },
  tinyNumber: function () {
    return Math.pow(2, Random.number(12));
  },
  unsignedNumber: function () {
    if (Random.chance(2)) {
      return Math.abs(Make.number());
    }
    return Math.pow(2, Random.number(65)) + Random.number(3) - 1;
  },
  evenNumber: function (number) {
    return number % 2 == 1 ? ++number : number;
  },
  number: function () {
    var value = Random.choose([
	  // Jesse: Math.floor(Math.pow(2, Random.float() * 17)) - 1
      [10, Make.float],
      [10, [Make.rangeNumber, Make.tinyNumber]],
      [ 1, Make.unsignedNumber]
    ]);
    return Random.chance(10) ? -value : value;
  },
  length: function () {
    return Make.number() + Make.lengthUnit();
  },
  digitsHex: function (n) {
    var s = '';
    while (n-- > 0) {
      s += (Random.number(16)).toString(16);
    }
    return s;
  },
  filledArray: function (fn, limit) {
    var array = [];
    var size = limit || Random.number(Make.tinyNumber);
    for (var i = 0; i < size; i++) {
      array.push(fn());
    }
    return array;
  },
  toString: function (object) {
    return object ? object.toSource() : '' + object
  },
  string: function (maxlen) {
    var s = "";
    if (maxlen == null || maxlen === undefined) {
      maxlen = Make.rangeNumber();
    }
    for (var i = 0; i < maxlen; i++) {
      //s += String.fromCodePoint(Random.pick(Make.layoutCharCodes));
      s += "A"
    }
    return s;
  },
  quotedString: function (maxlen) {
    return Utils.quote(Make.string(maxlen));
  },
  stringFromBlocks: function (set, maxlen) {
    var s = "";
    for (var i = 0; i < Random.number(maxlen || 255); i++) {
      s += Random.pick(set);
    }
    return s;
  },
  language: function () {
    // https://gist.github.com/tonyhb/635401
    return Random.pick(["en-US", "en", "de"]);
  },
  image: function () {
    return Utils.quote(Random.pick([
      "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=",
      "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQYV2P4DwABAQEAWk1v8QAAAABJRU5ErkJggg==",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=",
      "media/images/image1.jpg",
      "media/images/image3.jpg"
    ]));
  },
  video: function () {
    return Utils.quote(Random.pick([
      "media/video/video1.webm",
      "media/video/video2.webm"
    ]));
  },
  audio: function () {
    return Utils.quote(Random.pick([
      "media/audio/mono-uncompressed-8bit-8000hz.wav",
      "media/audio/mono-uncompressed-8bit-44100hz.wav",
      "media/audio/mono-uncompressed-32bit-8000hz.wav",
      "media/audio/mono-uncompressed-32bit-44100hz.wav"
    ]));
  },
  webvtt: function () {
    return Utils.quote(Random.pick([
      //'data:text/vtt,' + encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:00.001\ntest');,
      "media/video/sample.vtt"
    ]));
  },
  file: function () {
    return Random.pick([
      Make.image,
      Make.video,
      Make.audio
    ]);
  },
  FragmentWebGL1: [
    '#ifdef GL_ES\n\tprecision mediump float;\n#endif\nvarying vec4 vColor;\nvoid main(){\n\tgl_FragColor=vColor;\n}',
    'varying highp vec2 vTextureCoord;\nvarying highp vec3 vLighting;\nuniform sampler2D uSampler;\nvoid main(void) {\nhighp vec4 texelColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\ngl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);\n}'
  ],
  VertexWebGL1: [
    'attribute vec4 aVertex;\nattribute vec4 aColor;\nvarying vec4 vColor;\nvoid main(){\n\tvColor=aColor;\ngl_Position=aVertex;\n}',
    'attribute highp vec3 aVertexNormal;\nattribute highp vec3 aVertexPosition;\nattribute highp vec2 aTextureCoord;\nuniform highp mat4 uNormalMatrix;\nuniform highp mat4 uMVMatrix;\nuniform highp mat4 uPMatrix;\nvarying highp vec2 vTextureCoord;\nvarying highp vec3 vLighting;\nvoid main(void) {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = aTextureCoord;\nhighp vec3 ambientLight = vec3(0.6, 0.6, 0.6);\nhighp vec3 directionalLightColor = vec3(0.5, 0.5, 0.75);\nhighp vec3 directionalVector = vec3(0.85, 0.8, 0.75);\nhighp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);\nhighp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);\nvLighting = ambientLight + (directionalLightColor * directional);\n}'
  ],
  FragmentWebGL2: [
    'varying highp vec2 vTextureCoord;\nvarying highp vec3 vLighting;\nuniform sampler2D uSampler;\nvoid main(void) {\nhighp vec4 texelColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\ngl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);\n}'
    //'#version proto-200\n\nuniform sampler2D albedoMap;\nuniform sampler2D normalMap;\n\nvarying vec3 varyingTangent;\nvarying vec3 varyingBitangent;\nvarying vec3 varyingNormal;\nvarying vec2 varyingUV;\n void main(void)\n{\nvec3 albedo=texture2D(albedoMap,varyingUV).rgb;\nvec3 normal=texture2D(normalMap,varyingUV).rgb*2.0-1.0;\nfloat specularFactor=pow((albedo.r+albedo.g+albedo.b)*0.33,2.0);\nfloat specularHardness=2.0;\n\nvec3 spaceNormal=varyingTangent*normal.x+varyingBitangent*normal.y+varyingNormal*normal.z;gl_FragData[0]=vec4(albedo,1.0);gl_FragData[1]=vec4(spaceNormal*0.5 +0.5,1.0);gl_FragData[2]=vec4(specularFactor,specularHardness*0.1,0.0,1.0);}'
  ],
  VertexWebGL2: [
    'attribute highp vec3 aVertexNormal;\nattribute highp vec3 aVertexPosition;\nattribute highp vec2 aTextureCoord;\nuniform highp mat4 uNormalMatrix;\nuniform highp mat4 uMVMatrix;\nuniform highp mat4 uPMatrix;\nvarying highp vec2 vTextureCoord;\nvarying highp vec3 vLighting;\nvoid main(void) {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = aTextureCoord;\nhighp vec3 ambientLight = vec3(0.6, 0.6, 0.6);\nhighp vec3 directionalLightColor = vec3(0.5, 0.5, 0.75);\nhighp vec3 directionalVector = vec3(0.85, 0.8, 0.75);\nhighp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);\nhighp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);\nvLighting = ambientLight + (directionalLightColor * directional);\n}'
    //'#version proto-200\n\nattribute vec3 vertexPosition;\nattribute vec3 vertexTangent;\nattribute vec3 vertexBitangent;\nattribute vec3 vertexNormal;\n attribute vec2 vertexUV;\n\nuniform mat4 modelMatrix;\nuniform mat4 viewMatrix;\n\nvarying vec3 varyingTangent;\nvarying vec3 varyingBitangent;\nvarying vec3 varyingNormal;\nvarying vec2 varyingUV;\n\nvoid main(void){gl_Position=viewMatrix*(modelMatrix*vec4(vertexPosition,1.0));gl_Position.xy=gl_Position.xy*0.5+(float(gl_InstanceID)-0.5);varyingTangent=(modelMatrix*vec4(vertexTangent,0.0)).xyz;varyingBitangent=(modelMatrix*vec4(vertexBitangent,0.0)).xyz;varyingNormal=(modelMatrix*vec4(vertexNormal,0.0)).xyz;varyingUV = vertexUV;}'
  ],
  shaderPair: function(v, f) {
    var idx = Random.number(v.length);
    return {vertex: Utils.quote(v[idx]), fragment: Utils.quote(f[idx])};
  },
  SessionDescription: [
    "v=0\no=Mozilla-SIPUA 23597 0 IN IP4 0.0.0.0\ns=SIP Call\nt=0 0\na=ice-ufrag:f5fda439\na=ice-pwd:d0df8e2904bdbd29587966e797655970\na=fingerprint:sha-256 DF:69:78:20:8D:2E:08:CE:49:82:A3:11:79:1D:BF:B5:49:49:2D:32:82:2F:0D:88:84:A7:C6:63:23:63:A9:0F\nm=audio 52757 RTP/SAVPF 109 0 8 101\nc=IN IP4 192.168.129.33\na=rtpmap:109 opus/48000/2\na=ptime:20\na=rtpmap:0 PCMU/8000\na=rtpmap:8 PCMA/8000\na=rtpmap:101 telephone-event/8000\na=fmtp:101 0-15\na=sendrecv\na=candidate:0 1 UDP 2113601791 192.168.129.33 52757 typ host\na=candidate:0 2 UDP 2113601790 192.168.129.33 59738 typ host\nm=video 63901 RTP/SAVPF 120\nc=IN IP4 192.168.129.33\na=rtpmap:120 VP8/90000\na=sendrecv\na=candidate:0 1 UDP 2113601791 192.168.129.33 63901 typ host\na=candidate:0 2 UDP 2113601790 192.168.129.33 54165 typ host\nm=application 65080 SCTP/DTLS 5000\nc=IN IP4 192.168.129.33\na=fmtp:5000 protocol=webrtc-datachannel;streams=16\na=sendrecv\na=candidate:0 1 UDP 2113601791 192.168.129.33 65080 typ host\na=candidate:0 2 UDP 2113601790 192.168.129.33 62658 typ host"
  ],
  PeerConnectionProtocols: ["turn", "turns", "stun", "stuns"],
  randomIPv4: function() {
    return Random.pick([Random.number(255), Make.number]) + "." +
           Random.pick([Random.number(255), Make.number]) + "." +
           Random.pick([Random.number(255), Make.number]) + "." +
           Random.pick([Random.number(255), Make.number]);
  },
  randomIPv6: function() {
    return "[" + Make.stringFromBlocks([":", function() { return Make.digitsHex(Random.range(1, 4)) }]) + "]"
  },
  goodHostnames: [
    "127.0.0.1:8081",
    "23.21.150.121",
    "54.245.170.175",
    "0.0.0.0"
  ],
  badHostnames: [
    "[::192.9.5.5]:42",
    "google.org:8080",
    "2001:db8:85a3:0:0:8a2e:370:3478",
    "2001:db8:85a3::8a2e:370:3478",
    "::ffff:192.0.2.1",
    "::1",
    "0000:0000:0000:0000:0000:0000:0000:0001",
    "::192.0.2.128",
    "::ffff:192.0.2.128",
    "2001:db8::1:2",
    "2001:db8::1:1:1:1:1"
  ],
  randomBitmask: function (list) {
    if (list.length <= 1) {
      return list.join("");
    }
    var max = Random.range(2, list.length);
    var mask = Random.pick(list);
    for (var i = 1; i < max; i++) {
      mask += "|" + Random.pick(list);
    }
    return mask;
  },
  lengthUnit: function () {
    return Random.pick([
      "px", "em", "ex", "ch", "rem", "mm", "cm", "in", "pt", "pc", "%"
    ]);
  },
  percent: function () {
    return Make.number() + "%";
  },
  charset: function () {
    return Random.pick([
      "UTF-8", "ISO-8859-1"
    ]);
  },
  fontStyles: ["italic", "normal", "oblique", "inherit"],
  fontVariants: ["normal", "small-caps", "inherit"],
  fontWeights: ["normal", "bold", "bolder", "lighter"],
  fontSizeAbsolute: ["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large"],
  fontFamiliesGeneric: ["serif", "sans-serif", "cursive", "fantasy", "monospace"],
  fontFamilies: ['"' + "Times New Roman" + '"', "Arial", "Courier", "Helvetica"],
  fontFamily: function () {
    var s = Random.pick(Make.fontFamilies);
    if (Random.chance(8)) {
      s += ", " + Random.pick(Make.fontFamiliesGeneric);
    }
    return s;
  },
  fontSize: function () {
    return Make.unsignedNumber() + Make.lengthUnit();
  },
  font: function () {
    var s = "";
    if (Random.chance(4)) {
      s += Random.pick(Make.fontStyles) + " ";
    }
    if (Random.chance(4)) {
      s += Random.pick(Make.fontVariants) + " ";
    }
    if (Random.chance(4)) {
      s += Random.pick(Make.fontWeights) + " ";
    }
    if (Random.chance(4)) {
      s += Make.number() + "/";
    }
    s += Make.fontSize();
    s += " ";
    s += Make.fontFamily();
    return "'" + s + "'";
  },
  lineEnd: function () {
    return Random.pick([
      "\n", "\r", "\r\n", "\n\r"
    ]);
  },
  controlChar: function () {
    return Random.pick([
      "\b", "\t", "\n", "\v", "\f", "\r", "\0", "\c", "\a", "\e"
    ]);
  },
  color: function () {
    var s = "";
    switch (Random.number(6)) {
      case 0:
        s = "rgb" + JS.methodHead([Make.number(255), Make.number(255), Make.number(255)]);
        break;
      case 1:
        s = "rgba" + JS.methodHead([Make.number(255), Make.number(255), Make.number(255), Make.number]);
        break;
      case 2:
        s = "hsl" + JS.methodHead([Make.number, Make.percent, Make.percent]);
        break;
      case 3:
        s = "hsla" + JS.methodHead([Make.number, Make.percent, Make.percent, Make.number]);
        break;
      default:
        s = Random.pick(["#555", "#333", "#222", "red", "green", "blue"]);
    }
    return Utils.quote(s);
  },
  mimeType: function () {
    return Random.pick([
      "text/html",
      "text/plain",
      "text/css",
      "text/javascript",
      "image/jpeg",
      "image/gif",
      "image/png",
      "application/rss+xml",
      "application/vnd.mozilla.xul+xml",
      "application/xhtml+xml",
      "application/octet-stream",
      "application/x-shockwave-flash",
      "application/x-test",
      "audio/mpeg",
      "audio/ogg",
      "audio/ogg; codecs=vorbis",
      "video/ogg",
      'video/ogg; codecs="theora,vorbis"',
      "video/mp4",
      'video/mp4; codecs="avc1.42E01E,mp4a.40.2"'
    ]);
  },
  token: function () {
    return Random.pick([
      '*', '+', '%', '-', '!', '^', ':', '|', '&', '<', '>', '.', '"',
      '#', ' ', ';', ',', '{', '}', '(', ')', '[', ']', '/', '\\', '/*', '*/'
    ]);
  },
  basicType: function () {
    return Random.pick([
      "true", "null", "(new Object())", "undefined", "{}", "[]", "''", "function() {}"
    ]);
  },
  layoutCharCodes: [
    0,      // null
    160,    // non-breaking space
    0x005C, // backslash, but in some countries, represents local currency symbol (e.g. yen)
    0x00AD, // soft hyphen
    0x0BCC, // a Tamil character that is displayed as three glyphs
    // http://unicode.org/charts/PDF/U2000.pdf
    0x200B, // zero-width space
    0x200C, // zero-width non-joiner
    0x200D, // zero-width joiner
    0x200E, // left-to-right mark
    0x200F, // right-to-left mark
    0x2011, // non-breaking hyphen
    0x2027, // hyphenation point
    0x2028, // line separator
    0x2029, // paragraph separator
    0x202A, // left-to-right embedding
    0x202B, // right-to-left embedding
    0x202C, // pop directional formatting
    0x202D, // left-to-right override
    0x202E, // right-to-left override
    0x202F, // narrow no-break space
    0x2060, // word joiner
    0x2061, // function application (one of several invisible mathematical operators)
    // http://unicode.org/charts/PDF/U3000.pdf
    0x3000, // ideographic space (CJK)
    // http://unicode.org/charts/PDF/U0300.pdf
    0x0301, // combining acute accent (if it appears after "a", it turns into "a" with an accent)
    // Arabic has the interesting property that most letters connect to the next letter.
    // Some code calls this "shaping".
    0x0643, // arabic letter kaf
    0x0645, // arabic letter meem
    0x06CD, // arabic letter yeh with tail
    0xFDDE, // invalid unicode? but somehow associated with arabic.
    // http://unicode.org/reports/tr36/tr36-7.html#Buffer_Overflows
    // Characters with especially high expansion factors when they go through various unicode "normalizations"
    0x1F82,
    0xFDFA,
    0xFB2C,
    0x0390,
    // 0x1D160, // hmm, need surrogates
    // Characters with especially high expansion factors when lowercased or uppercased
    0x023A,
    0x0041,
    0xDC1D, // a low surrogate
    0xDB00, // a high surrogate
    // UFFF0.pdf
    0xFFF9, // interlinear annotation anchor
    0xFFFA, // interlinear annotation seperator
    0xFFFB, // interlinear annotation terminator
    0xFFFC, // object replacement character
    0xFFFD, // replacement character
    0xFEFF, // zero width no-break space
    0xFFFF, // not a character
    0x00A0, // no-break space
    0x2426,
    0x003F,
    0x00BF,
    0xDC80,
    0xDCFF,
    // http://en.wikipedia.org/wiki/Mapping_of_Unicode_characters
    0x205F, // mathematical space
    0x2061, // mathematical function application
    0x2064, // mathematical invisible separator
    0x2044  // fraction slash character
  ],
  // http://www.unicode.org/Public/6.0.0/ucd/UnicodeData.txt
  unicodeCombiningCharacters: [
    [0x0300, 0x036F], // Combining Diacritical Marks
    [0x0483, 0x0489],
    [0x07EB, 0x07F3],
    [0x135D, 0x135F],
    [0x1A7F, 0x1A7F],
    [0x1B6B, 0x1B73],
    [0x1DC0, 0x1DFF], // Combining Diacritical Marks Supplement
    [0x20D0, 0x2DFF],
    [0x3099, 0x309A],
    [0xA66F, 0xA6F1],
    [0xA8E0, 0xA8F1],
    [0xFE20, 0xFE26], // Combining Half Marks
    [0x101FD, 0x101FD],
    [0x1D165, 0x1D169],
    [0x1D16D, 0x1D172],
    [0x1D17B, 0x1D18B],
    [0x1D1AA, 0x1D1AD],
    [0x1D242, 0x1D244]
  ],
  unicodeBMP: [
    // BMP = Basic Multilingual Plane
    [0x0000, 0xFFFF]
  ],
  unicodeSMP: [
    // SMP = Supplementary Multilingual Plane
    [0x10000, 0x13FFF],
    [0x16000, 0x16FFF],
    [0x1B000, 0x1BFFF],
    [0x1D000, 0x1DFFF],
    [0x1F000, 0x1FFFF]
  ],
  unicodeSIP: [
    // SIP = Supplementary Ideographic Plane
    [0x20000, 0x2BFFF],
    [0x2F000, 0x2FFFF]
  ],
  unicodeSSP: [
    // SSP = Supplementary Special-purpose Plane
    [0xE0000, 0xE0FFF]
  ],
  registeredFontFeatures: [
    'aalt', 'abvf', 'abvm', 'abvs', 'afrc', 'akhn', 'blwf', 'blwm', 'blws',
    'calt', 'case', 'ccmp', 'cfar', 'cjct', 'clig', 'cpct', 'cpsp', 'cswh',
    'curs', 'cv01-cv99', 'c2pc', 'c2sc', 'dist', 'dlig', 'dnom', 'expt',
    'falt', 'fin2', 'fin3', 'fina', 'frac', 'fwid', 'half', 'haln', 'halt',
    'hist', 'hkna', 'hlig', 'hngl', 'hojo', 'hwid', 'init', 'isol', 'ital',
    'jalt', 'jp78', 'jp83', 'jp90', 'jp04', 'kern', 'lfbd', 'liga', 'ljmo',
    'lnum', 'locl', 'ltra', 'ltrm', 'mark', 'med2', 'medi', 'mgrk', 'mkmk',
    'mset', 'nalt', 'nlck', 'nukt', 'numr', 'onum', 'opbd', 'ordn', 'ornm',
    'palt', 'pcap', 'pkna', 'pnum', 'pref', 'pres', 'pstf', 'psts', 'pwid',
    'qwid', 'rand', 'rkrf', 'rlig', 'rphf', 'rtbd', 'rtla', 'rtlm', 'ruby',
    'salt', 'sinf', 'size', 'smcp', 'smpl', 'ss01', 'ss02', 'ss03', 'ss04',
    'ss05', 'ss06', 'ss07', 'ss08', 'ss09', 'ss10', 'ss11', 'ss12', 'ss13',
    'ss14', 'ss15', 'ss16', 'ss17', 'ss18', 'ss19', 'ss20', 'subs', 'sups',
    'swsh', 'titl', 'tjmo', 'tnam', 'tnum', 'trad', 'twid', 'unic', 'valt',
    'vatu', 'vert', 'vhal', 'vjmo', 'vkna', 'vkrn', 'vpal', 'vrt2', 'zero'
  ],
  assignmentOperator: ["=", "-=", "+=", "*=", "/="],
  arithmeticOperator: ["%", "-", "+", "*", "/"]
};


if (!String.fromCodePoint) {
  String.fromCodePoint = function fromCodePoint() {
    var chars = [], point, offset, units, i;
    for (i = 0; i < arguments.length; ++i) {
      point = arguments[i];
      offset = point - 0x10000;
      units = point > 0xFFFF ? [0xD800 + (offset >> 10), 0xDC00 + (offset & 0x3FF)] : [point];
      chars.push(String.fromCharCode.apply(null, units));
    }
    return chars.join("");
  }
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (str) { return (this.match(str + "$") == str) };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (str) {
    return (this.match("^" + str) == str)
  };
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""))
  };
}

if (!String.prototype.insert) {
  String.prototype.insert = function (data, idx) {
    return this.slice(0, idx) + data + this.slice(idx, this.length);
  };
}

if (!Array.prototype.has) {
  Array.prototype.has = function (v) {
    return this.indexOf(v) != -1;
  };
}

if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (array, fn) {
    for (var i = 0; i < array.length; i++) {
      fn(array[i]);
    }
  }
}

if (!Array.prototype.map) {
  Array.prototype.map = function (fn, array) {
    var result = [];
    Array.forEach(array, function (element) {
      result.push(fn(element));
    });
    return result;
  }
}

// Todo: Rename to Gadget
var JS = {
  methodHead: function (list, numOptional) {
    if (isNaN(numOptional)) {
      numOptional = 0;
    }
    var arity = list.length - Random.number(numOptional);
    var params = [];
    for (var i = 0; i < arity; i++) {
      params.push(Random.pick([list[i]]));
    }
    return "(" + params.join(", ") + ")";
  },
  methodCall: function (objectName, methodHash) {
    if(!Utils.getKeysFromHash(methodHash).length || !objectName) {
      return "";
    }
    var methodName = Random.key(methodHash);
    var methodArgs = methodHash[methodName];
    if (typeof(methodArgs) == "function") { // Todo: Hmmmm..
      return methodArgs();
    }
    return objectName + "." + methodName + JS.methodHead(methodArgs);
  },
  setAttribute: function (objectName, attributeHash) {
    if(!Utils.getKeysFromHash(attributeHash).length || !objectName) {
      return "";
    }
    var attributeName = Random.key(attributeHash);
    var attributeValue = Random.pick(attributeHash[attributeName]);
    var operator = " = ";
    /*
    if (typeof(attributeValue) == "number" && Random.chance(8)) {
      operator = " " + Make.randomAssignmentOperator() + " ";
    }
    if (typeof(attributeValue) == "string") {
     attributeValue = "'" + attributeValue + "'";
    }
    */
    return objectName + "." + attributeName + operator + attributeValue + ";";
  },
  makeConstraint: function (keys, values) {
    var o = {};
    var n = Random.range(0, keys.length);
    while (n--) {
      o[Random.pick(keys)] = Random.pick(values);
    }
    return o;
  },
  makeRandomOptions: function (base_o) {
    var o = {}, unique = Random.some(Object.keys(base_o));
    for (var i = 0; i < unique.length; i++) {
      o[unique[i]] = Random.pick(base_o[unique[i]]);
    }
    return JSON.stringify(o);
  },
  safely: function (s) {
    if (window.debug) {
      return "try { " + s + " } catch(e) { Logger.JSError(e); }";
    }
    return "try { " + s + " } catch(e) { }";
  },
  makeLoop: function (s, max) {
    return "for (var i = 0; i < " + (max || Make.rangeNumber()) + "; i++) {" + s + "}";
  },
  makeArray: function (type, arrayLength, cb) {
    if (type == null || type === undefined) {
      type = Random.index(["Uint8", "Float32"]);
    }
    switch (Random.number(8)) {
      case 0:
        var src = "function() { var buffer = new " + type + "Array(" + arrayLength + ");";
        src += JS.makeLoop("buffer[i] = " + cb() + ";", arrayLength);
        src += "return buffer;}()";
        return src;
      case 1:
        return "new " + type + "Array([" + Make.filledArray(cb, arrayLength) + "])";
      default:
        return "new " + type + "Array(" + arrayLength + ")";
    }
  },
  randListIndex: function (objName) {
    return Random.number() + ' % ' + o.pick(objName) + '.length';
  },
  addElementToBody: function (name) {
    return "(document.body || document.documentElement).appendChild" + JS.methodHead([name]);
  },
  forceGC: function () {
    if (Platform.isMozilla) {}
    if (Platform.isChrome) {
        if (window.GCController)
          return GCController.collect();
    }
    if (Platform.isSafari) {}
    if (Platform.isIE) {}
  },
  getRandomElement: function() {
      return "document.getElementsByTagName('*')[" + Random.number(document.getElementsByTagName("*").length) + "]";
  }
};


var Utils = {
  objToString: function (obj) {
    try {
      return "" + obj
    } catch (e) {
      return "[" + e + "]"
    }
  },
  getAllProperties: function (obj) {
    var list = [];
    while (obj) {
      list = list.concat(Object.getOwnPropertyNames(obj));
      obj = Object.getPrototypeOf(obj);
    }
    return list;
  },
  getKeysFromHash: function (obj) {
    var list = [];
    for (var p in obj) {
      list.push(p);
    }
    return list;
  },
  quote: function (obj) {
    return JSON.stringify(obj);
  },
  shuffle: function (list) {
    var newArray = list.slice();
    var len = newArray.length;
    var i = len;
    while (i--) {
      var p = parseInt(Math.random() * len);
      var t = newArray[i];
      newArray[i] = newArray[p];
      newArray[p] = t;
    }
    return newArray;
  },
  uniqueList: function (list) {
    var tmp = {}, r = [];
    for (var i = 0; i < list.length; i++) {
      tmp[list[i]] = list[i];
    }
    for (var i in tmp) {
      r.push(tmp[i]);
    }
    return r;
  },
  mergeHash: function (obj1, obj2) {
    for (var p in obj2) {
      try {
        if (obj2[p].constructor == Object) {
          obj1[p] = Utils.mergeHash(obj1[p], obj2[p]);
        } else {
          obj1[p] = obj2[p];
        }
      } catch (e) {
        obj1[p] = obj2[p];
      }
    }
    return obj1;
  },
  traceback: function () {
    Logger.error("===[ Traceback ]");
    try {
      throw new Error();
    } catch (e) {
      Logger.dump(e.stack || e.stacktrace || "");
    }
    Logger.error("===");
  }
};


function Block(list, optional) {
  if (optional == true) {
    if (Random.chance(6)) {
      return '';
    }
  }
  function goDeeper(item) {
    if (item == null || item === undefined) {
      return "";
    }
    if (typeof(item) == "function") {
      return item();
    }
    if (typeof(item) == "string") {
      return item;
    }
    if (item instanceof(Array)) {
      var s = "";
      for (var i = 0; i < item.length; i++) {
        s += goDeeper(item[i]);
      }
      return s;
    }
    return item;
  }
  var asString = "";
  for (var i = 0; i < list.length; i++) {
    asString += goDeeper(list[i]);
  }
  return asString;
}


var nodeBlockList = [
  'window',
  'top',
  'self',
  'parent',
  'frames',
  'document',
  /* Opera */
  'parentNode',
  'parentElement',
  'offsetParent',
  /* WebKit + Opera */
  'nextElementSibling',
  'nextSibling',
  /* WebKit */
  'firstChild',
  'firstElementChild',
  'lastChild',
  'lastElementChild',
  'childNodes',
  'ownerDocument',
  'documentElement',
  'defaultView',
  /* MSIE*/
  'parentWindow',
  'parentTextEdit',
  'children',
  /* Firefox */
  'content',
  'previousSibling',
  'previousElementSibling',
  /* Not interested */
  'style',
  'classList',
  'itemType', 'itemRef', 'itemProp'
];

var functionBlackList = [
  'createBuffer',
  'dispatchEvent',
  'removeEventListener',
  'addEventListener',
  'lookupNamespaceURI',
  'setNamedItem',
  'insertBefore',
  'getAttribute',
  'getAttributeNS',
  'getAttributeNodeNS',
  'hasAttributeNS'
];

function inspectNode(node, levels) {
  if (levels === undefined) {
    levels = 4;
  }
  var all = {
    nodes: [],
    functions: [],
    strings: [],
    numbers: []
  };
  var level = 0;

  function branch(node) {
    if (level == levels) {
      return;
    }
    level += 1;
    var name = node;
    all.nodes.push(name);
    try {
      node = eval(node);
    } catch (e) {
      Utils.traceback();
      return;
    }
    for (var key in node) {
      var member = name + '.' + key;
      try {
        var evaledMember = eval(member);
      } catch (e) {
        continue;
      }
      if (typeof(evaledMember) == 'object') {
        if (nodeBlockList.has(key)) {
          continue;
        }
        branch(member);
      }
      if (typeof(evaledMember) == 'function') {
        if (!functionBlackList.has(key)) {
          all.functions.push(member);
        }
        continue;
      }
      if (typeof(evaledMember) == 'string') {
        all.strings.push(member);
        continue;
      }
      if (typeof(evaledMember) == 'number') {
        all.numbers.push(member);
        continue;
      }
    }
    level -= 1;
  }

  branch(node);
  return all;
}
