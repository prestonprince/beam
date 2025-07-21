// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf(
    "/",
    url.charCodeAt(9) === 58 ? 13 : 8
  );
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : void 0;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  redirect = (location, status) => {
    this.header("Location", String(location));
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          if (!part) {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// worker/web/index.ts
var app = new Hono2();
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hvbm8vZGlzdC9jb21wb3NlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3QvcmVxdWVzdC9jb25zdGFudHMuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hvbm8vZGlzdC91dGlscy9ib2R5LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3QvdXRpbHMvdXJsLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3QvcmVxdWVzdC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvaG9uby9kaXN0L3V0aWxzL2h0bWwuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hvbm8vZGlzdC9jb250ZXh0LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3Qvcm91dGVyLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3QvdXRpbHMvY29uc3RhbnRzLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3QvaG9uby1iYXNlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3Qvcm91dGVyL3JlZy1leHAtcm91dGVyL25vZGUuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hvbm8vZGlzdC9yb3V0ZXIvcmVnLWV4cC1yb3V0ZXIvdHJpZS5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvaG9uby9kaXN0L3JvdXRlci9yZWctZXhwLXJvdXRlci9yb3V0ZXIuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2hvbm8vZGlzdC9yb3V0ZXIvc21hcnQtcm91dGVyL3JvdXRlci5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvaG9uby9kaXN0L3JvdXRlci90cmllLXJvdXRlci9ub2RlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ob25vL2Rpc3Qvcm91dGVyL3RyaWUtcm91dGVyL3JvdXRlci5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvaG9uby9kaXN0L2hvbm8uanMiLCAiLi4vLi4vLi4vLi4vLi4vd29ya2VyL3dlYi9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gc3JjL2NvbXBvc2UudHNcbnZhciBjb21wb3NlID0gKG1pZGRsZXdhcmUsIG9uRXJyb3IsIG9uTm90Rm91bmQpID0+IHtcbiAgcmV0dXJuIChjb250ZXh0LCBuZXh0KSA9PiB7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgcmV0dXJuIGRpc3BhdGNoKDApO1xuICAgIGFzeW5jIGZ1bmN0aW9uIGRpc3BhdGNoKGkpIHtcbiAgICAgIGlmIChpIDw9IGluZGV4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5leHQoKSBjYWxsZWQgbXVsdGlwbGUgdGltZXNcIik7XG4gICAgICB9XG4gICAgICBpbmRleCA9IGk7XG4gICAgICBsZXQgcmVzO1xuICAgICAgbGV0IGlzRXJyb3IgPSBmYWxzZTtcbiAgICAgIGxldCBoYW5kbGVyO1xuICAgICAgaWYgKG1pZGRsZXdhcmVbaV0pIHtcbiAgICAgICAgaGFuZGxlciA9IG1pZGRsZXdhcmVbaV1bMF1bMF07XG4gICAgICAgIGNvbnRleHQucmVxLnJvdXRlSW5kZXggPSBpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGFuZGxlciA9IGkgPT09IG1pZGRsZXdhcmUubGVuZ3RoICYmIG5leHQgfHwgdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXMgPSBhd2FpdCBoYW5kbGVyKGNvbnRleHQsICgpID0+IGRpc3BhdGNoKGkgKyAxKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvciAmJiBvbkVycm9yKSB7XG4gICAgICAgICAgICBjb250ZXh0LmVycm9yID0gZXJyO1xuICAgICAgICAgICAgcmVzID0gYXdhaXQgb25FcnJvcihlcnIsIGNvbnRleHQpO1xuICAgICAgICAgICAgaXNFcnJvciA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjb250ZXh0LmZpbmFsaXplZCA9PT0gZmFsc2UgJiYgb25Ob3RGb3VuZCkge1xuICAgICAgICAgIHJlcyA9IGF3YWl0IG9uTm90Rm91bmQoY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZXMgJiYgKGNvbnRleHQuZmluYWxpemVkID09PSBmYWxzZSB8fCBpc0Vycm9yKSkge1xuICAgICAgICBjb250ZXh0LnJlcyA9IHJlcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cbiAgfTtcbn07XG5leHBvcnQge1xuICBjb21wb3NlXG59O1xuIiwgIi8vIHNyYy9yZXF1ZXN0L2NvbnN0YW50cy50c1xudmFyIEdFVF9NQVRDSF9SRVNVTFQgPSBTeW1ib2woKTtcbmV4cG9ydCB7XG4gIEdFVF9NQVRDSF9SRVNVTFRcbn07XG4iLCAiLy8gc3JjL3V0aWxzL2JvZHkudHNcbmltcG9ydCB7IEhvbm9SZXF1ZXN0IH0gZnJvbSBcIi4uL3JlcXVlc3QuanNcIjtcbnZhciBwYXJzZUJvZHkgPSBhc3luYyAocmVxdWVzdCwgb3B0aW9ucyA9IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpKSA9PiB7XG4gIGNvbnN0IHsgYWxsID0gZmFsc2UsIGRvdCA9IGZhbHNlIH0gPSBvcHRpb25zO1xuICBjb25zdCBoZWFkZXJzID0gcmVxdWVzdCBpbnN0YW5jZW9mIEhvbm9SZXF1ZXN0ID8gcmVxdWVzdC5yYXcuaGVhZGVycyA6IHJlcXVlc3QuaGVhZGVycztcbiAgY29uc3QgY29udGVudFR5cGUgPSBoZWFkZXJzLmdldChcIkNvbnRlbnQtVHlwZVwiKTtcbiAgaWYgKGNvbnRlbnRUeXBlPy5zdGFydHNXaXRoKFwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiKSB8fCBjb250ZW50VHlwZT8uc3RhcnRzV2l0aChcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiKSkge1xuICAgIHJldHVybiBwYXJzZUZvcm1EYXRhKHJlcXVlc3QsIHsgYWxsLCBkb3QgfSk7XG4gIH1cbiAgcmV0dXJuIHt9O1xufTtcbmFzeW5jIGZ1bmN0aW9uIHBhcnNlRm9ybURhdGEocmVxdWVzdCwgb3B0aW9ucykge1xuICBjb25zdCBmb3JtRGF0YSA9IGF3YWl0IHJlcXVlc3QuZm9ybURhdGEoKTtcbiAgaWYgKGZvcm1EYXRhKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRGb3JtRGF0YVRvQm9keURhdGEoZm9ybURhdGEsIG9wdGlvbnMpO1xuICB9XG4gIHJldHVybiB7fTtcbn1cbmZ1bmN0aW9uIGNvbnZlcnRGb3JtRGF0YVRvQm9keURhdGEoZm9ybURhdGEsIG9wdGlvbnMpIHtcbiAgY29uc3QgZm9ybSA9IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBmb3JtRGF0YS5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgY29uc3Qgc2hvdWxkUGFyc2VBbGxWYWx1ZXMgPSBvcHRpb25zLmFsbCB8fCBrZXkuZW5kc1dpdGgoXCJbXVwiKTtcbiAgICBpZiAoIXNob3VsZFBhcnNlQWxsVmFsdWVzKSB7XG4gICAgICBmb3JtW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGFuZGxlUGFyc2luZ0FsbFZhbHVlcyhmb3JtLCBrZXksIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICBpZiAob3B0aW9ucy5kb3QpIHtcbiAgICBPYmplY3QuZW50cmllcyhmb3JtKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGNvbnN0IHNob3VsZFBhcnNlRG90VmFsdWVzID0ga2V5LmluY2x1ZGVzKFwiLlwiKTtcbiAgICAgIGlmIChzaG91bGRQYXJzZURvdFZhbHVlcykge1xuICAgICAgICBoYW5kbGVQYXJzaW5nTmVzdGVkVmFsdWVzKGZvcm0sIGtleSwgdmFsdWUpO1xuICAgICAgICBkZWxldGUgZm9ybVtrZXldO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBmb3JtO1xufVxudmFyIGhhbmRsZVBhcnNpbmdBbGxWYWx1ZXMgPSAoZm9ybSwga2V5LCB2YWx1ZSkgPT4ge1xuICBpZiAoZm9ybVtrZXldICE9PSB2b2lkIDApIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShmb3JtW2tleV0pKSB7XG4gICAgICA7XG4gICAgICBmb3JtW2tleV0ucHVzaCh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcm1ba2V5XSA9IFtmb3JtW2tleV0sIHZhbHVlXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFrZXkuZW5kc1dpdGgoXCJbXVwiKSkge1xuICAgICAgZm9ybVtrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcm1ba2V5XSA9IFt2YWx1ZV07XG4gICAgfVxuICB9XG59O1xudmFyIGhhbmRsZVBhcnNpbmdOZXN0ZWRWYWx1ZXMgPSAoZm9ybSwga2V5LCB2YWx1ZSkgPT4ge1xuICBsZXQgbmVzdGVkRm9ybSA9IGZvcm07XG4gIGNvbnN0IGtleXMgPSBrZXkuc3BsaXQoXCIuXCIpO1xuICBrZXlzLmZvckVhY2goKGtleTIsIGluZGV4KSA9PiB7XG4gICAgaWYgKGluZGV4ID09PSBrZXlzLmxlbmd0aCAtIDEpIHtcbiAgICAgIG5lc3RlZEZvcm1ba2V5Ml0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFuZXN0ZWRGb3JtW2tleTJdIHx8IHR5cGVvZiBuZXN0ZWRGb3JtW2tleTJdICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkobmVzdGVkRm9ybVtrZXkyXSkgfHwgbmVzdGVkRm9ybVtrZXkyXSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgICAgbmVzdGVkRm9ybVtrZXkyXSA9IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgbmVzdGVkRm9ybSA9IG5lc3RlZEZvcm1ba2V5Ml07XG4gICAgfVxuICB9KTtcbn07XG5leHBvcnQge1xuICBwYXJzZUJvZHlcbn07XG4iLCAiLy8gc3JjL3V0aWxzL3VybC50c1xudmFyIHNwbGl0UGF0aCA9IChwYXRoKSA9PiB7XG4gIGNvbnN0IHBhdGhzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gIGlmIChwYXRoc1swXSA9PT0gXCJcIikge1xuICAgIHBhdGhzLnNoaWZ0KCk7XG4gIH1cbiAgcmV0dXJuIHBhdGhzO1xufTtcbnZhciBzcGxpdFJvdXRpbmdQYXRoID0gKHJvdXRlUGF0aCkgPT4ge1xuICBjb25zdCB7IGdyb3VwcywgcGF0aCB9ID0gZXh0cmFjdEdyb3Vwc0Zyb21QYXRoKHJvdXRlUGF0aCk7XG4gIGNvbnN0IHBhdGhzID0gc3BsaXRQYXRoKHBhdGgpO1xuICByZXR1cm4gcmVwbGFjZUdyb3VwTWFya3MocGF0aHMsIGdyb3Vwcyk7XG59O1xudmFyIGV4dHJhY3RHcm91cHNGcm9tUGF0aCA9IChwYXRoKSA9PiB7XG4gIGNvbnN0IGdyb3VwcyA9IFtdO1xuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXHtbXn1dK1xcfS9nLCAobWF0Y2gsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbWFyayA9IGBAJHtpbmRleH1gO1xuICAgIGdyb3Vwcy5wdXNoKFttYXJrLCBtYXRjaF0pO1xuICAgIHJldHVybiBtYXJrO1xuICB9KTtcbiAgcmV0dXJuIHsgZ3JvdXBzLCBwYXRoIH07XG59O1xudmFyIHJlcGxhY2VHcm91cE1hcmtzID0gKHBhdGhzLCBncm91cHMpID0+IHtcbiAgZm9yIChsZXQgaSA9IGdyb3Vwcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IFttYXJrXSA9IGdyb3Vwc1tpXTtcbiAgICBmb3IgKGxldCBqID0gcGF0aHMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgIGlmIChwYXRoc1tqXS5pbmNsdWRlcyhtYXJrKSkge1xuICAgICAgICBwYXRoc1tqXSA9IHBhdGhzW2pdLnJlcGxhY2UobWFyaywgZ3JvdXBzW2ldWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXRocztcbn07XG52YXIgcGF0dGVybkNhY2hlID0ge307XG52YXIgZ2V0UGF0dGVybiA9IChsYWJlbCwgbmV4dCkgPT4ge1xuICBpZiAobGFiZWwgPT09IFwiKlwiKSB7XG4gICAgcmV0dXJuIFwiKlwiO1xuICB9XG4gIGNvbnN0IG1hdGNoID0gbGFiZWwubWF0Y2goL15cXDooW15cXHtcXH1dKykoPzpcXHsoLispXFx9KT8kLyk7XG4gIGlmIChtYXRjaCkge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gYCR7bGFiZWx9IyR7bmV4dH1gO1xuICAgIGlmICghcGF0dGVybkNhY2hlW2NhY2hlS2V5XSkge1xuICAgICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICAgIHBhdHRlcm5DYWNoZVtjYWNoZUtleV0gPSBuZXh0ICYmIG5leHRbMF0gIT09IFwiOlwiICYmIG5leHRbMF0gIT09IFwiKlwiID8gW2NhY2hlS2V5LCBtYXRjaFsxXSwgbmV3IFJlZ0V4cChgXiR7bWF0Y2hbMl19KD89LyR7bmV4dH0pYCldIDogW2xhYmVsLCBtYXRjaFsxXSwgbmV3IFJlZ0V4cChgXiR7bWF0Y2hbMl19JGApXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhdHRlcm5DYWNoZVtjYWNoZUtleV0gPSBbbGFiZWwsIG1hdGNoWzFdLCB0cnVlXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdHRlcm5DYWNoZVtjYWNoZUtleV07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59O1xudmFyIHRyeURlY29kZSA9IChzdHIsIGRlY29kZXIpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlcihzdHIpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyg/OiVbMC05QS1GYS1mXXsyfSkrL2csIChtYXRjaCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGRlY29kZXIobWF0Y2gpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcbnZhciB0cnlEZWNvZGVVUkkgPSAoc3RyKSA9PiB0cnlEZWNvZGUoc3RyLCBkZWNvZGVVUkkpO1xudmFyIGdldFBhdGggPSAocmVxdWVzdCkgPT4ge1xuICBjb25zdCB1cmwgPSByZXF1ZXN0LnVybDtcbiAgY29uc3Qgc3RhcnQgPSB1cmwuaW5kZXhPZihcbiAgICBcIi9cIixcbiAgICB1cmwuY2hhckNvZGVBdCg5KSA9PT0gNTggPyAxMyA6IDhcbiAgKTtcbiAgbGV0IGkgPSBzdGFydDtcbiAgZm9yICg7IGkgPCB1cmwubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaGFyQ29kZSA9IHVybC5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChjaGFyQ29kZSA9PT0gMzcpIHtcbiAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPSB1cmwuaW5kZXhPZihcIj9cIiwgaSk7XG4gICAgICBjb25zdCBwYXRoID0gdXJsLnNsaWNlKHN0YXJ0LCBxdWVyeUluZGV4ID09PSAtMSA/IHZvaWQgMCA6IHF1ZXJ5SW5kZXgpO1xuICAgICAgcmV0dXJuIHRyeURlY29kZVVSSShwYXRoLmluY2x1ZGVzKFwiJTI1XCIpID8gcGF0aC5yZXBsYWNlKC8lMjUvZywgXCIlMjUyNVwiKSA6IHBhdGgpO1xuICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT09IDYzKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVybC5zbGljZShzdGFydCwgaSk7XG59O1xudmFyIGdldFF1ZXJ5U3RyaW5ncyA9ICh1cmwpID0+IHtcbiAgY29uc3QgcXVlcnlJbmRleCA9IHVybC5pbmRleE9mKFwiP1wiLCA4KTtcbiAgcmV0dXJuIHF1ZXJ5SW5kZXggPT09IC0xID8gXCJcIiA6IFwiP1wiICsgdXJsLnNsaWNlKHF1ZXJ5SW5kZXggKyAxKTtcbn07XG52YXIgZ2V0UGF0aE5vU3RyaWN0ID0gKHJlcXVlc3QpID0+IHtcbiAgY29uc3QgcmVzdWx0ID0gZ2V0UGF0aChyZXF1ZXN0KTtcbiAgcmV0dXJuIHJlc3VsdC5sZW5ndGggPiAxICYmIHJlc3VsdC5hdCgtMSkgPT09IFwiL1wiID8gcmVzdWx0LnNsaWNlKDAsIC0xKSA6IHJlc3VsdDtcbn07XG52YXIgbWVyZ2VQYXRoID0gKGJhc2UsIHN1YiwgLi4ucmVzdCkgPT4ge1xuICBpZiAocmVzdC5sZW5ndGgpIHtcbiAgICBzdWIgPSBtZXJnZVBhdGgoc3ViLCAuLi5yZXN0KTtcbiAgfVxuICByZXR1cm4gYCR7YmFzZT8uWzBdID09PSBcIi9cIiA/IFwiXCIgOiBcIi9cIn0ke2Jhc2V9JHtzdWIgPT09IFwiL1wiID8gXCJcIiA6IGAke2Jhc2U/LmF0KC0xKSA9PT0gXCIvXCIgPyBcIlwiIDogXCIvXCJ9JHtzdWI/LlswXSA9PT0gXCIvXCIgPyBzdWIuc2xpY2UoMSkgOiBzdWJ9YH1gO1xufTtcbnZhciBjaGVja09wdGlvbmFsUGFyYW1ldGVyID0gKHBhdGgpID0+IHtcbiAgaWYgKHBhdGguY2hhckNvZGVBdChwYXRoLmxlbmd0aCAtIDEpICE9PSA2MyB8fCAhcGF0aC5pbmNsdWRlcyhcIjpcIikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCBzZWdtZW50cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICBjb25zdCByZXN1bHRzID0gW107XG4gIGxldCBiYXNlUGF0aCA9IFwiXCI7XG4gIHNlZ21lbnRzLmZvckVhY2goKHNlZ21lbnQpID0+IHtcbiAgICBpZiAoc2VnbWVudCAhPT0gXCJcIiAmJiAhL1xcOi8udGVzdChzZWdtZW50KSkge1xuICAgICAgYmFzZVBhdGggKz0gXCIvXCIgKyBzZWdtZW50O1xuICAgIH0gZWxzZSBpZiAoL1xcOi8udGVzdChzZWdtZW50KSkge1xuICAgICAgaWYgKC9cXD8vLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwICYmIGJhc2VQYXRoID09PSBcIlwiKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKFwiL1wiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goYmFzZVBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9wdGlvbmFsU2VnbWVudCA9IHNlZ21lbnQucmVwbGFjZShcIj9cIiwgXCJcIik7XG4gICAgICAgIGJhc2VQYXRoICs9IFwiL1wiICsgb3B0aW9uYWxTZWdtZW50O1xuICAgICAgICByZXN1bHRzLnB1c2goYmFzZVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZVBhdGggKz0gXCIvXCIgKyBzZWdtZW50O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXN1bHRzLmZpbHRlcigodiwgaSwgYSkgPT4gYS5pbmRleE9mKHYpID09PSBpKTtcbn07XG52YXIgX2RlY29kZVVSSSA9ICh2YWx1ZSkgPT4ge1xuICBpZiAoIS9bJStdLy50ZXN0KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAodmFsdWUuaW5kZXhPZihcIitcIikgIT09IC0xKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpO1xuICB9XG4gIHJldHVybiB2YWx1ZS5pbmRleE9mKFwiJVwiKSAhPT0gLTEgPyB0cnlEZWNvZGUodmFsdWUsIGRlY29kZVVSSUNvbXBvbmVudF8pIDogdmFsdWU7XG59O1xudmFyIF9nZXRRdWVyeVBhcmFtID0gKHVybCwga2V5LCBtdWx0aXBsZSkgPT4ge1xuICBsZXQgZW5jb2RlZDtcbiAgaWYgKCFtdWx0aXBsZSAmJiBrZXkgJiYgIS9bJStdLy50ZXN0KGtleSkpIHtcbiAgICBsZXQga2V5SW5kZXgyID0gdXJsLmluZGV4T2YoYD8ke2tleX1gLCA4KTtcbiAgICBpZiAoa2V5SW5kZXgyID09PSAtMSkge1xuICAgICAga2V5SW5kZXgyID0gdXJsLmluZGV4T2YoYCYke2tleX1gLCA4KTtcbiAgICB9XG4gICAgd2hpbGUgKGtleUluZGV4MiAhPT0gLTEpIHtcbiAgICAgIGNvbnN0IHRyYWlsaW5nS2V5Q29kZSA9IHVybC5jaGFyQ29kZUF0KGtleUluZGV4MiArIGtleS5sZW5ndGggKyAxKTtcbiAgICAgIGlmICh0cmFpbGluZ0tleUNvZGUgPT09IDYxKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlSW5kZXggPSBrZXlJbmRleDIgKyBrZXkubGVuZ3RoICsgMjtcbiAgICAgICAgY29uc3QgZW5kSW5kZXggPSB1cmwuaW5kZXhPZihcIiZcIiwgdmFsdWVJbmRleCk7XG4gICAgICAgIHJldHVybiBfZGVjb2RlVVJJKHVybC5zbGljZSh2YWx1ZUluZGV4LCBlbmRJbmRleCA9PT0gLTEgPyB2b2lkIDAgOiBlbmRJbmRleCkpO1xuICAgICAgfSBlbHNlIGlmICh0cmFpbGluZ0tleUNvZGUgPT0gMzggfHwgaXNOYU4odHJhaWxpbmdLZXlDb2RlKSkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cbiAgICAgIGtleUluZGV4MiA9IHVybC5pbmRleE9mKGAmJHtrZXl9YCwga2V5SW5kZXgyICsgMSk7XG4gICAgfVxuICAgIGVuY29kZWQgPSAvWyUrXS8udGVzdCh1cmwpO1xuICAgIGlmICghZW5jb2RlZCkge1xuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgY29uc3QgcmVzdWx0cyA9IHt9O1xuICBlbmNvZGVkID8/PSAvWyUrXS8udGVzdCh1cmwpO1xuICBsZXQga2V5SW5kZXggPSB1cmwuaW5kZXhPZihcIj9cIiwgOCk7XG4gIHdoaWxlIChrZXlJbmRleCAhPT0gLTEpIHtcbiAgICBjb25zdCBuZXh0S2V5SW5kZXggPSB1cmwuaW5kZXhPZihcIiZcIiwga2V5SW5kZXggKyAxKTtcbiAgICBsZXQgdmFsdWVJbmRleCA9IHVybC5pbmRleE9mKFwiPVwiLCBrZXlJbmRleCk7XG4gICAgaWYgKHZhbHVlSW5kZXggPiBuZXh0S2V5SW5kZXggJiYgbmV4dEtleUluZGV4ICE9PSAtMSkge1xuICAgICAgdmFsdWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBsZXQgbmFtZSA9IHVybC5zbGljZShcbiAgICAgIGtleUluZGV4ICsgMSxcbiAgICAgIHZhbHVlSW5kZXggPT09IC0xID8gbmV4dEtleUluZGV4ID09PSAtMSA/IHZvaWQgMCA6IG5leHRLZXlJbmRleCA6IHZhbHVlSW5kZXhcbiAgICApO1xuICAgIGlmIChlbmNvZGVkKSB7XG4gICAgICBuYW1lID0gX2RlY29kZVVSSShuYW1lKTtcbiAgICB9XG4gICAga2V5SW5kZXggPSBuZXh0S2V5SW5kZXg7XG4gICAgaWYgKG5hbWUgPT09IFwiXCIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBsZXQgdmFsdWU7XG4gICAgaWYgKHZhbHVlSW5kZXggPT09IC0xKSB7XG4gICAgICB2YWx1ZSA9IFwiXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gdXJsLnNsaWNlKHZhbHVlSW5kZXggKyAxLCBuZXh0S2V5SW5kZXggPT09IC0xID8gdm9pZCAwIDogbmV4dEtleUluZGV4KTtcbiAgICAgIGlmIChlbmNvZGVkKSB7XG4gICAgICAgIHZhbHVlID0gX2RlY29kZVVSSSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgaWYgKCEocmVzdWx0c1tuYW1lXSAmJiBBcnJheS5pc0FycmF5KHJlc3VsdHNbbmFtZV0pKSkge1xuICAgICAgICByZXN1bHRzW25hbWVdID0gW107XG4gICAgICB9XG4gICAgICA7XG4gICAgICByZXN1bHRzW25hbWVdLnB1c2godmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRzW25hbWVdID8/PSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtleSA/IHJlc3VsdHNba2V5XSA6IHJlc3VsdHM7XG59O1xudmFyIGdldFF1ZXJ5UGFyYW0gPSBfZ2V0UXVlcnlQYXJhbTtcbnZhciBnZXRRdWVyeVBhcmFtcyA9ICh1cmwsIGtleSkgPT4ge1xuICByZXR1cm4gX2dldFF1ZXJ5UGFyYW0odXJsLCBrZXksIHRydWUpO1xufTtcbnZhciBkZWNvZGVVUklDb21wb25lbnRfID0gZGVjb2RlVVJJQ29tcG9uZW50O1xuZXhwb3J0IHtcbiAgY2hlY2tPcHRpb25hbFBhcmFtZXRlcixcbiAgZGVjb2RlVVJJQ29tcG9uZW50XyxcbiAgZ2V0UGF0aCxcbiAgZ2V0UGF0aE5vU3RyaWN0LFxuICBnZXRQYXR0ZXJuLFxuICBnZXRRdWVyeVBhcmFtLFxuICBnZXRRdWVyeVBhcmFtcyxcbiAgZ2V0UXVlcnlTdHJpbmdzLFxuICBtZXJnZVBhdGgsXG4gIHNwbGl0UGF0aCxcbiAgc3BsaXRSb3V0aW5nUGF0aCxcbiAgdHJ5RGVjb2RlXG59O1xuIiwgIi8vIHNyYy9yZXF1ZXN0LnRzXG5pbXBvcnQgeyBHRVRfTUFUQ0hfUkVTVUxUIH0gZnJvbSBcIi4vcmVxdWVzdC9jb25zdGFudHMuanNcIjtcbmltcG9ydCB7IHBhcnNlQm9keSB9IGZyb20gXCIuL3V0aWxzL2JvZHkuanNcIjtcbmltcG9ydCB7IGRlY29kZVVSSUNvbXBvbmVudF8sIGdldFF1ZXJ5UGFyYW0sIGdldFF1ZXJ5UGFyYW1zLCB0cnlEZWNvZGUgfSBmcm9tIFwiLi91dGlscy91cmwuanNcIjtcbnZhciB0cnlEZWNvZGVVUklDb21wb25lbnQgPSAoc3RyKSA9PiB0cnlEZWNvZGUoc3RyLCBkZWNvZGVVUklDb21wb25lbnRfKTtcbnZhciBIb25vUmVxdWVzdCA9IGNsYXNzIHtcbiAgcmF3O1xuICAjdmFsaWRhdGVkRGF0YTtcbiAgI21hdGNoUmVzdWx0O1xuICByb3V0ZUluZGV4ID0gMDtcbiAgcGF0aDtcbiAgYm9keUNhY2hlID0ge307XG4gIGNvbnN0cnVjdG9yKHJlcXVlc3QsIHBhdGggPSBcIi9cIiwgbWF0Y2hSZXN1bHQgPSBbW11dKSB7XG4gICAgdGhpcy5yYXcgPSByZXF1ZXN0O1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy4jbWF0Y2hSZXN1bHQgPSBtYXRjaFJlc3VsdDtcbiAgICB0aGlzLiN2YWxpZGF0ZWREYXRhID0ge307XG4gIH1cbiAgcGFyYW0oa2V5KSB7XG4gICAgcmV0dXJuIGtleSA/IHRoaXMuI2dldERlY29kZWRQYXJhbShrZXkpIDogdGhpcy4jZ2V0QWxsRGVjb2RlZFBhcmFtcygpO1xuICB9XG4gICNnZXREZWNvZGVkUGFyYW0oa2V5KSB7XG4gICAgY29uc3QgcGFyYW1LZXkgPSB0aGlzLiNtYXRjaFJlc3VsdFswXVt0aGlzLnJvdXRlSW5kZXhdWzFdW2tleV07XG4gICAgY29uc3QgcGFyYW0gPSB0aGlzLiNnZXRQYXJhbVZhbHVlKHBhcmFtS2V5KTtcbiAgICByZXR1cm4gcGFyYW0gPyAvXFwlLy50ZXN0KHBhcmFtKSA/IHRyeURlY29kZVVSSUNvbXBvbmVudChwYXJhbSkgOiBwYXJhbSA6IHZvaWQgMDtcbiAgfVxuICAjZ2V0QWxsRGVjb2RlZFBhcmFtcygpIHtcbiAgICBjb25zdCBkZWNvZGVkID0ge307XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuI21hdGNoUmVzdWx0WzBdW3RoaXMucm91dGVJbmRleF1bMV0pO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy4jZ2V0UGFyYW1WYWx1ZSh0aGlzLiNtYXRjaFJlc3VsdFswXVt0aGlzLnJvdXRlSW5kZXhdWzFdW2tleV0pO1xuICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBkZWNvZGVkW2tleV0gPSAvXFwlLy50ZXN0KHZhbHVlKSA/IHRyeURlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlY29kZWQ7XG4gIH1cbiAgI2dldFBhcmFtVmFsdWUocGFyYW1LZXkpIHtcbiAgICByZXR1cm4gdGhpcy4jbWF0Y2hSZXN1bHRbMV0gPyB0aGlzLiNtYXRjaFJlc3VsdFsxXVtwYXJhbUtleV0gOiBwYXJhbUtleTtcbiAgfVxuICBxdWVyeShrZXkpIHtcbiAgICByZXR1cm4gZ2V0UXVlcnlQYXJhbSh0aGlzLnVybCwga2V5KTtcbiAgfVxuICBxdWVyaWVzKGtleSkge1xuICAgIHJldHVybiBnZXRRdWVyeVBhcmFtcyh0aGlzLnVybCwga2V5KTtcbiAgfVxuICBoZWFkZXIobmFtZSkge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5yYXcuaGVhZGVycy5nZXQobmFtZSkgPz8gdm9pZCAwO1xuICAgIH1cbiAgICBjb25zdCBoZWFkZXJEYXRhID0ge307XG4gICAgdGhpcy5yYXcuaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBoZWFkZXJEYXRhW2tleV0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gaGVhZGVyRGF0YTtcbiAgfVxuICBhc3luYyBwYXJzZUJvZHkob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLmJvZHlDYWNoZS5wYXJzZWRCb2R5ID8/PSBhd2FpdCBwYXJzZUJvZHkodGhpcywgb3B0aW9ucyk7XG4gIH1cbiAgI2NhY2hlZEJvZHkgPSAoa2V5KSA9PiB7XG4gICAgY29uc3QgeyBib2R5Q2FjaGUsIHJhdyB9ID0gdGhpcztcbiAgICBjb25zdCBjYWNoZWRCb2R5ID0gYm9keUNhY2hlW2tleV07XG4gICAgaWYgKGNhY2hlZEJvZHkpIHtcbiAgICAgIHJldHVybiBjYWNoZWRCb2R5O1xuICAgIH1cbiAgICBjb25zdCBhbnlDYWNoZWRLZXkgPSBPYmplY3Qua2V5cyhib2R5Q2FjaGUpWzBdO1xuICAgIGlmIChhbnlDYWNoZWRLZXkpIHtcbiAgICAgIHJldHVybiBib2R5Q2FjaGVbYW55Q2FjaGVkS2V5XS50aGVuKChib2R5KSA9PiB7XG4gICAgICAgIGlmIChhbnlDYWNoZWRLZXkgPT09IFwianNvblwiKSB7XG4gICAgICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoYm9keSlba2V5XSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBib2R5Q2FjaGVba2V5XSA9IHJhd1trZXldKCk7XG4gIH07XG4gIGpzb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuI2NhY2hlZEJvZHkoXCJ0ZXh0XCIpLnRoZW4oKHRleHQpID0+IEpTT04ucGFyc2UodGV4dCkpO1xuICB9XG4gIHRleHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuI2NhY2hlZEJvZHkoXCJ0ZXh0XCIpO1xuICB9XG4gIGFycmF5QnVmZmVyKCkge1xuICAgIHJldHVybiB0aGlzLiNjYWNoZWRCb2R5KFwiYXJyYXlCdWZmZXJcIik7XG4gIH1cbiAgYmxvYigpIHtcbiAgICByZXR1cm4gdGhpcy4jY2FjaGVkQm9keShcImJsb2JcIik7XG4gIH1cbiAgZm9ybURhdGEoKSB7XG4gICAgcmV0dXJuIHRoaXMuI2NhY2hlZEJvZHkoXCJmb3JtRGF0YVwiKTtcbiAgfVxuICBhZGRWYWxpZGF0ZWREYXRhKHRhcmdldCwgZGF0YSkge1xuICAgIHRoaXMuI3ZhbGlkYXRlZERhdGFbdGFyZ2V0XSA9IGRhdGE7XG4gIH1cbiAgdmFsaWQodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRoaXMuI3ZhbGlkYXRlZERhdGFbdGFyZ2V0XTtcbiAgfVxuICBnZXQgdXJsKCkge1xuICAgIHJldHVybiB0aGlzLnJhdy51cmw7XG4gIH1cbiAgZ2V0IG1ldGhvZCgpIHtcbiAgICByZXR1cm4gdGhpcy5yYXcubWV0aG9kO1xuICB9XG4gIGdldCBbR0VUX01BVENIX1JFU1VMVF0oKSB7XG4gICAgcmV0dXJuIHRoaXMuI21hdGNoUmVzdWx0O1xuICB9XG4gIGdldCBtYXRjaGVkUm91dGVzKCkge1xuICAgIHJldHVybiB0aGlzLiNtYXRjaFJlc3VsdFswXS5tYXAoKFtbLCByb3V0ZV1dKSA9PiByb3V0ZSk7XG4gIH1cbiAgZ2V0IHJvdXRlUGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy4jbWF0Y2hSZXN1bHRbMF0ubWFwKChbWywgcm91dGVdXSkgPT4gcm91dGUpW3RoaXMucm91dGVJbmRleF0ucGF0aDtcbiAgfVxufTtcbmV4cG9ydCB7XG4gIEhvbm9SZXF1ZXN0XG59O1xuIiwgIi8vIHNyYy91dGlscy9odG1sLnRzXG52YXIgSHRtbEVzY2FwZWRDYWxsYmFja1BoYXNlID0ge1xuICBTdHJpbmdpZnk6IDEsXG4gIEJlZm9yZVN0cmVhbTogMixcbiAgU3RyZWFtOiAzXG59O1xudmFyIHJhdyA9ICh2YWx1ZSwgY2FsbGJhY2tzKSA9PiB7XG4gIGNvbnN0IGVzY2FwZWRTdHJpbmcgPSBuZXcgU3RyaW5nKHZhbHVlKTtcbiAgZXNjYXBlZFN0cmluZy5pc0VzY2FwZWQgPSB0cnVlO1xuICBlc2NhcGVkU3RyaW5nLmNhbGxiYWNrcyA9IGNhbGxiYWNrcztcbiAgcmV0dXJuIGVzY2FwZWRTdHJpbmc7XG59O1xudmFyIGVzY2FwZVJlID0gL1smPD4nXCJdLztcbnZhciBzdHJpbmdCdWZmZXJUb1N0cmluZyA9IGFzeW5jIChidWZmZXIsIGNhbGxiYWNrcykgPT4ge1xuICBsZXQgc3RyID0gXCJcIjtcbiAgY2FsbGJhY2tzIHx8PSBbXTtcbiAgY29uc3QgcmVzb2x2ZWRCdWZmZXIgPSBhd2FpdCBQcm9taXNlLmFsbChidWZmZXIpO1xuICBmb3IgKGxldCBpID0gcmVzb2x2ZWRCdWZmZXIubGVuZ3RoIC0gMTsgOyBpLS0pIHtcbiAgICBzdHIgKz0gcmVzb2x2ZWRCdWZmZXJbaV07XG4gICAgaS0tO1xuICAgIGlmIChpIDwgMCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxldCByID0gcmVzb2x2ZWRCdWZmZXJbaV07XG4gICAgaWYgKHR5cGVvZiByID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBjYWxsYmFja3MucHVzaCguLi5yLmNhbGxiYWNrcyB8fCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IGlzRXNjYXBlZCA9IHIuaXNFc2NhcGVkO1xuICAgIHIgPSBhd2FpdCAodHlwZW9mIHIgPT09IFwib2JqZWN0XCIgPyByLnRvU3RyaW5nKCkgOiByKTtcbiAgICBpZiAodHlwZW9mIHIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGNhbGxiYWNrcy5wdXNoKC4uLnIuY2FsbGJhY2tzIHx8IFtdKTtcbiAgICB9XG4gICAgaWYgKHIuaXNFc2NhcGVkID8/IGlzRXNjYXBlZCkge1xuICAgICAgc3RyICs9IHI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJ1ZiA9IFtzdHJdO1xuICAgICAgZXNjYXBlVG9CdWZmZXIociwgYnVmKTtcbiAgICAgIHN0ciA9IGJ1ZlswXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJhdyhzdHIsIGNhbGxiYWNrcyk7XG59O1xudmFyIGVzY2FwZVRvQnVmZmVyID0gKHN0ciwgYnVmZmVyKSA9PiB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLnNlYXJjaChlc2NhcGVSZSk7XG4gIGlmIChtYXRjaCA9PT0gLTEpIHtcbiAgICBidWZmZXJbMF0gKz0gc3RyO1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgZXNjYXBlO1xuICBsZXQgaW5kZXg7XG4gIGxldCBsYXN0SW5kZXggPSAwO1xuICBmb3IgKGluZGV4ID0gbWF0Y2g7IGluZGV4IDwgc3RyLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIHN3aXRjaCAoc3RyLmNoYXJDb2RlQXQoaW5kZXgpKSB7XG4gICAgICBjYXNlIDM0OlxuICAgICAgICBlc2NhcGUgPSBcIiZxdW90O1wiO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzk6XG4gICAgICAgIGVzY2FwZSA9IFwiJiMzOTtcIjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM4OlxuICAgICAgICBlc2NhcGUgPSBcIiZhbXA7XCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2MDpcbiAgICAgICAgZXNjYXBlID0gXCImbHQ7XCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2MjpcbiAgICAgICAgZXNjYXBlID0gXCImZ3Q7XCI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGJ1ZmZlclswXSArPSBzdHIuc3Vic3RyaW5nKGxhc3RJbmRleCwgaW5kZXgpICsgZXNjYXBlO1xuICAgIGxhc3RJbmRleCA9IGluZGV4ICsgMTtcbiAgfVxuICBidWZmZXJbMF0gKz0gc3RyLnN1YnN0cmluZyhsYXN0SW5kZXgsIGluZGV4KTtcbn07XG52YXIgcmVzb2x2ZUNhbGxiYWNrU3luYyA9IChzdHIpID0+IHtcbiAgY29uc3QgY2FsbGJhY2tzID0gc3RyLmNhbGxiYWNrcztcbiAgaWYgKCFjYWxsYmFja3M/Lmxlbmd0aCkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbiAgY29uc3QgYnVmZmVyID0gW3N0cl07XG4gIGNvbnN0IGNvbnRleHQgPSB7fTtcbiAgY2FsbGJhY2tzLmZvckVhY2goKGMpID0+IGMoeyBwaGFzZTogSHRtbEVzY2FwZWRDYWxsYmFja1BoYXNlLlN0cmluZ2lmeSwgYnVmZmVyLCBjb250ZXh0IH0pKTtcbiAgcmV0dXJuIGJ1ZmZlclswXTtcbn07XG52YXIgcmVzb2x2ZUNhbGxiYWNrID0gYXN5bmMgKHN0ciwgcGhhc2UsIHByZXNlcnZlQ2FsbGJhY2tzLCBjb250ZXh0LCBidWZmZXIpID0+IHtcbiAgaWYgKHR5cGVvZiBzdHIgPT09IFwib2JqZWN0XCIgJiYgIShzdHIgaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgaWYgKCEoc3RyIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAoc3RyIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgc3RyID0gYXdhaXQgc3RyO1xuICAgIH1cbiAgfVxuICBjb25zdCBjYWxsYmFja3MgPSBzdHIuY2FsbGJhY2tzO1xuICBpZiAoIWNhbGxiYWNrcz8ubGVuZ3RoKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShzdHIpO1xuICB9XG4gIGlmIChidWZmZXIpIHtcbiAgICBidWZmZXJbMF0gKz0gc3RyO1xuICB9IGVsc2Uge1xuICAgIGJ1ZmZlciA9IFtzdHJdO1xuICB9XG4gIGNvbnN0IHJlc1N0ciA9IFByb21pc2UuYWxsKGNhbGxiYWNrcy5tYXAoKGMpID0+IGMoeyBwaGFzZSwgYnVmZmVyLCBjb250ZXh0IH0pKSkudGhlbihcbiAgICAocmVzKSA9PiBQcm9taXNlLmFsbChcbiAgICAgIHJlcy5maWx0ZXIoQm9vbGVhbikubWFwKChzdHIyKSA9PiByZXNvbHZlQ2FsbGJhY2soc3RyMiwgcGhhc2UsIGZhbHNlLCBjb250ZXh0LCBidWZmZXIpKVxuICAgICkudGhlbigoKSA9PiBidWZmZXJbMF0pXG4gICk7XG4gIGlmIChwcmVzZXJ2ZUNhbGxiYWNrcykge1xuICAgIHJldHVybiByYXcoYXdhaXQgcmVzU3RyLCBjYWxsYmFja3MpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXNTdHI7XG4gIH1cbn07XG5leHBvcnQge1xuICBIdG1sRXNjYXBlZENhbGxiYWNrUGhhc2UsXG4gIGVzY2FwZVRvQnVmZmVyLFxuICByYXcsXG4gIHJlc29sdmVDYWxsYmFjayxcbiAgcmVzb2x2ZUNhbGxiYWNrU3luYyxcbiAgc3RyaW5nQnVmZmVyVG9TdHJpbmdcbn07XG4iLCAiLy8gc3JjL2NvbnRleHQudHNcbmltcG9ydCB7IEhvbm9SZXF1ZXN0IH0gZnJvbSBcIi4vcmVxdWVzdC5qc1wiO1xuaW1wb3J0IHsgSHRtbEVzY2FwZWRDYWxsYmFja1BoYXNlLCByZXNvbHZlQ2FsbGJhY2sgfSBmcm9tIFwiLi91dGlscy9odG1sLmpzXCI7XG52YXIgVEVYVF9QTEFJTiA9IFwidGV4dC9wbGFpbjsgY2hhcnNldD1VVEYtOFwiO1xudmFyIHNldERlZmF1bHRDb250ZW50VHlwZSA9IChjb250ZW50VHlwZSwgaGVhZGVycykgPT4ge1xuICByZXR1cm4ge1xuICAgIFwiQ29udGVudC1UeXBlXCI6IGNvbnRlbnRUeXBlLFxuICAgIC4uLmhlYWRlcnNcbiAgfTtcbn07XG52YXIgQ29udGV4dCA9IGNsYXNzIHtcbiAgI3Jhd1JlcXVlc3Q7XG4gICNyZXE7XG4gIGVudiA9IHt9O1xuICAjdmFyO1xuICBmaW5hbGl6ZWQgPSBmYWxzZTtcbiAgZXJyb3I7XG4gICNzdGF0dXM7XG4gICNleGVjdXRpb25DdHg7XG4gICNyZXM7XG4gICNsYXlvdXQ7XG4gICNyZW5kZXJlcjtcbiAgI25vdEZvdW5kSGFuZGxlcjtcbiAgI3ByZXBhcmVkSGVhZGVycztcbiAgI21hdGNoUmVzdWx0O1xuICAjcGF0aDtcbiAgY29uc3RydWN0b3IocmVxLCBvcHRpb25zKSB7XG4gICAgdGhpcy4jcmF3UmVxdWVzdCA9IHJlcTtcbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgdGhpcy4jZXhlY3V0aW9uQ3R4ID0gb3B0aW9ucy5leGVjdXRpb25DdHg7XG4gICAgICB0aGlzLmVudiA9IG9wdGlvbnMuZW52O1xuICAgICAgdGhpcy4jbm90Rm91bmRIYW5kbGVyID0gb3B0aW9ucy5ub3RGb3VuZEhhbmRsZXI7XG4gICAgICB0aGlzLiNwYXRoID0gb3B0aW9ucy5wYXRoO1xuICAgICAgdGhpcy4jbWF0Y2hSZXN1bHQgPSBvcHRpb25zLm1hdGNoUmVzdWx0O1xuICAgIH1cbiAgfVxuICBnZXQgcmVxKCkge1xuICAgIHRoaXMuI3JlcSA/Pz0gbmV3IEhvbm9SZXF1ZXN0KHRoaXMuI3Jhd1JlcXVlc3QsIHRoaXMuI3BhdGgsIHRoaXMuI21hdGNoUmVzdWx0KTtcbiAgICByZXR1cm4gdGhpcy4jcmVxO1xuICB9XG4gIGdldCBldmVudCgpIHtcbiAgICBpZiAodGhpcy4jZXhlY3V0aW9uQ3R4ICYmIFwicmVzcG9uZFdpdGhcIiBpbiB0aGlzLiNleGVjdXRpb25DdHgpIHtcbiAgICAgIHJldHVybiB0aGlzLiNleGVjdXRpb25DdHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiVGhpcyBjb250ZXh0IGhhcyBubyBGZXRjaEV2ZW50XCIpO1xuICAgIH1cbiAgfVxuICBnZXQgZXhlY3V0aW9uQ3R4KCkge1xuICAgIGlmICh0aGlzLiNleGVjdXRpb25DdHgpIHtcbiAgICAgIHJldHVybiB0aGlzLiNleGVjdXRpb25DdHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiVGhpcyBjb250ZXh0IGhhcyBubyBFeGVjdXRpb25Db250ZXh0XCIpO1xuICAgIH1cbiAgfVxuICBnZXQgcmVzKCkge1xuICAgIHJldHVybiB0aGlzLiNyZXMgfHw9IG5ldyBSZXNwb25zZShudWxsLCB7XG4gICAgICBoZWFkZXJzOiB0aGlzLiNwcmVwYXJlZEhlYWRlcnMgPz89IG5ldyBIZWFkZXJzKClcbiAgICB9KTtcbiAgfVxuICBzZXQgcmVzKF9yZXMpIHtcbiAgICBpZiAodGhpcy4jcmVzICYmIF9yZXMpIHtcbiAgICAgIF9yZXMgPSBuZXcgUmVzcG9uc2UoX3Jlcy5ib2R5LCBfcmVzKTtcbiAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMuI3Jlcy5oZWFkZXJzLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoayA9PT0gXCJjb250ZW50LXR5cGVcIikge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrID09PSBcInNldC1jb29raWVcIikge1xuICAgICAgICAgIGNvbnN0IGNvb2tpZXMgPSB0aGlzLiNyZXMuaGVhZGVycy5nZXRTZXRDb29raWUoKTtcbiAgICAgICAgICBfcmVzLmhlYWRlcnMuZGVsZXRlKFwic2V0LWNvb2tpZVwiKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBjb29raWVzKSB7XG4gICAgICAgICAgICBfcmVzLmhlYWRlcnMuYXBwZW5kKFwic2V0LWNvb2tpZVwiLCBjb29raWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfcmVzLmhlYWRlcnMuc2V0KGssIHYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuI3JlcyA9IF9yZXM7XG4gICAgdGhpcy5maW5hbGl6ZWQgPSB0cnVlO1xuICB9XG4gIHJlbmRlciA9ICguLi5hcmdzKSA9PiB7XG4gICAgdGhpcy4jcmVuZGVyZXIgPz89IChjb250ZW50KSA9PiB0aGlzLmh0bWwoY29udGVudCk7XG4gICAgcmV0dXJuIHRoaXMuI3JlbmRlcmVyKC4uLmFyZ3MpO1xuICB9O1xuICBzZXRMYXlvdXQgPSAobGF5b3V0KSA9PiB0aGlzLiNsYXlvdXQgPSBsYXlvdXQ7XG4gIGdldExheW91dCA9ICgpID0+IHRoaXMuI2xheW91dDtcbiAgc2V0UmVuZGVyZXIgPSAocmVuZGVyZXIpID0+IHtcbiAgICB0aGlzLiNyZW5kZXJlciA9IHJlbmRlcmVyO1xuICB9O1xuICBoZWFkZXIgPSAobmFtZSwgdmFsdWUsIG9wdGlvbnMpID0+IHtcbiAgICBpZiAodGhpcy5maW5hbGl6ZWQpIHtcbiAgICAgIHRoaXMuI3JlcyA9IG5ldyBSZXNwb25zZSh0aGlzLiNyZXMuYm9keSwgdGhpcy4jcmVzKTtcbiAgICB9XG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuI3JlcyA/IHRoaXMuI3Jlcy5oZWFkZXJzIDogdGhpcy4jcHJlcGFyZWRIZWFkZXJzID8/PSBuZXcgSGVhZGVycygpO1xuICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICBoZWFkZXJzLmRlbGV0ZShuYW1lKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnM/LmFwcGVuZCkge1xuICAgICAgaGVhZGVycy5hcHBlbmQobmFtZSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWFkZXJzLnNldChuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9O1xuICBzdGF0dXMgPSAoc3RhdHVzKSA9PiB7XG4gICAgdGhpcy4jc3RhdHVzID0gc3RhdHVzO1xuICB9O1xuICBzZXQgPSAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgIHRoaXMuI3ZhciA/Pz0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcbiAgICB0aGlzLiN2YXIuc2V0KGtleSwgdmFsdWUpO1xuICB9O1xuICBnZXQgPSAoa2V5KSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuI3ZhciA/IHRoaXMuI3Zhci5nZXQoa2V5KSA6IHZvaWQgMDtcbiAgfTtcbiAgZ2V0IHZhcigpIHtcbiAgICBpZiAoIXRoaXMuI3Zhcikge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKHRoaXMuI3Zhcik7XG4gIH1cbiAgI25ld1Jlc3BvbnNlKGRhdGEsIGFyZywgaGVhZGVycykge1xuICAgIGNvbnN0IHJlc3BvbnNlSGVhZGVycyA9IHRoaXMuI3JlcyA/IG5ldyBIZWFkZXJzKHRoaXMuI3Jlcy5oZWFkZXJzKSA6IHRoaXMuI3ByZXBhcmVkSGVhZGVycyA/PyBuZXcgSGVhZGVycygpO1xuICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIFwiaGVhZGVyc1wiIGluIGFyZykge1xuICAgICAgY29uc3QgYXJnSGVhZGVycyA9IGFyZy5oZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycyA/IGFyZy5oZWFkZXJzIDogbmV3IEhlYWRlcnMoYXJnLmhlYWRlcnMpO1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgYXJnSGVhZGVycykge1xuICAgICAgICBpZiAoa2V5LnRvTG93ZXJDYXNlKCkgPT09IFwic2V0LWNvb2tpZVwiKSB7XG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnMuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChoZWFkZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhoZWFkZXJzKSkge1xuICAgICAgICBpZiAodHlwZW9mIHYgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnMuc2V0KGssIHYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3BvbnNlSGVhZGVycy5kZWxldGUoayk7XG4gICAgICAgICAgZm9yIChjb25zdCB2MiBvZiB2KSB7XG4gICAgICAgICAgICByZXNwb25zZUhlYWRlcnMuYXBwZW5kKGssIHYyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc3RhdHVzID0gdHlwZW9mIGFyZyA9PT0gXCJudW1iZXJcIiA/IGFyZyA6IGFyZz8uc3RhdHVzID8/IHRoaXMuI3N0YXR1cztcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKGRhdGEsIHsgc3RhdHVzLCBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMgfSk7XG4gIH1cbiAgbmV3UmVzcG9uc2UgPSAoLi4uYXJncykgPT4gdGhpcy4jbmV3UmVzcG9uc2UoLi4uYXJncyk7XG4gIGJvZHkgPSAoZGF0YSwgYXJnLCBoZWFkZXJzKSA9PiB0aGlzLiNuZXdSZXNwb25zZShkYXRhLCBhcmcsIGhlYWRlcnMpO1xuICB0ZXh0ID0gKHRleHQsIGFyZywgaGVhZGVycykgPT4ge1xuICAgIHJldHVybiAhdGhpcy4jcHJlcGFyZWRIZWFkZXJzICYmICF0aGlzLiNzdGF0dXMgJiYgIWFyZyAmJiAhaGVhZGVycyAmJiAhdGhpcy5maW5hbGl6ZWQgPyBuZXcgUmVzcG9uc2UodGV4dCkgOiB0aGlzLiNuZXdSZXNwb25zZShcbiAgICAgIHRleHQsXG4gICAgICBhcmcsXG4gICAgICBzZXREZWZhdWx0Q29udGVudFR5cGUoVEVYVF9QTEFJTiwgaGVhZGVycylcbiAgICApO1xuICB9O1xuICBqc29uID0gKG9iamVjdCwgYXJnLCBoZWFkZXJzKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuI25ld1Jlc3BvbnNlKFxuICAgICAgSlNPTi5zdHJpbmdpZnkob2JqZWN0KSxcbiAgICAgIGFyZyxcbiAgICAgIHNldERlZmF1bHRDb250ZW50VHlwZShcImFwcGxpY2F0aW9uL2pzb25cIiwgaGVhZGVycylcbiAgICApO1xuICB9O1xuICBodG1sID0gKGh0bWwsIGFyZywgaGVhZGVycykgPT4ge1xuICAgIGNvbnN0IHJlcyA9IChodG1sMikgPT4gdGhpcy4jbmV3UmVzcG9uc2UoaHRtbDIsIGFyZywgc2V0RGVmYXVsdENvbnRlbnRUeXBlKFwidGV4dC9odG1sOyBjaGFyc2V0PVVURi04XCIsIGhlYWRlcnMpKTtcbiAgICByZXR1cm4gdHlwZW9mIGh0bWwgPT09IFwib2JqZWN0XCIgPyByZXNvbHZlQ2FsbGJhY2soaHRtbCwgSHRtbEVzY2FwZWRDYWxsYmFja1BoYXNlLlN0cmluZ2lmeSwgZmFsc2UsIHt9KS50aGVuKHJlcykgOiByZXMoaHRtbCk7XG4gIH07XG4gIHJlZGlyZWN0ID0gKGxvY2F0aW9uLCBzdGF0dXMpID0+IHtcbiAgICB0aGlzLmhlYWRlcihcIkxvY2F0aW9uXCIsIFN0cmluZyhsb2NhdGlvbikpO1xuICAgIHJldHVybiB0aGlzLm5ld1Jlc3BvbnNlKG51bGwsIHN0YXR1cyA/PyAzMDIpO1xuICB9O1xuICBub3RGb3VuZCA9ICgpID0+IHtcbiAgICB0aGlzLiNub3RGb3VuZEhhbmRsZXIgPz89ICgpID0+IG5ldyBSZXNwb25zZSgpO1xuICAgIHJldHVybiB0aGlzLiNub3RGb3VuZEhhbmRsZXIodGhpcyk7XG4gIH07XG59O1xuZXhwb3J0IHtcbiAgQ29udGV4dCxcbiAgVEVYVF9QTEFJTlxufTtcbiIsICIvLyBzcmMvcm91dGVyLnRzXG52YXIgTUVUSE9EX05BTUVfQUxMID0gXCJBTExcIjtcbnZhciBNRVRIT0RfTkFNRV9BTExfTE9XRVJDQVNFID0gXCJhbGxcIjtcbnZhciBNRVRIT0RTID0gW1wiZ2V0XCIsIFwicG9zdFwiLCBcInB1dFwiLCBcImRlbGV0ZVwiLCBcIm9wdGlvbnNcIiwgXCJwYXRjaFwiXTtcbnZhciBNRVNTQUdFX01BVENIRVJfSVNfQUxSRUFEWV9CVUlMVCA9IFwiQ2FuIG5vdCBhZGQgYSByb3V0ZSBzaW5jZSB0aGUgbWF0Y2hlciBpcyBhbHJlYWR5IGJ1aWx0LlwiO1xudmFyIFVuc3VwcG9ydGVkUGF0aEVycm9yID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG59O1xuZXhwb3J0IHtcbiAgTUVTU0FHRV9NQVRDSEVSX0lTX0FMUkVBRFlfQlVJTFQsXG4gIE1FVEhPRFMsXG4gIE1FVEhPRF9OQU1FX0FMTCxcbiAgTUVUSE9EX05BTUVfQUxMX0xPV0VSQ0FTRSxcbiAgVW5zdXBwb3J0ZWRQYXRoRXJyb3Jcbn07XG4iLCAiLy8gc3JjL3V0aWxzL2NvbnN0YW50cy50c1xudmFyIENPTVBPU0VEX0hBTkRMRVIgPSBcIl9fQ09NUE9TRURfSEFORExFUlwiO1xuZXhwb3J0IHtcbiAgQ09NUE9TRURfSEFORExFUlxufTtcbiIsICIvLyBzcmMvaG9uby1iYXNlLnRzXG5pbXBvcnQgeyBjb21wb3NlIH0gZnJvbSBcIi4vY29tcG9zZS5qc1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2NvbnRleHQuanNcIjtcbmltcG9ydCB7IE1FVEhPRFMsIE1FVEhPRF9OQU1FX0FMTCwgTUVUSE9EX05BTUVfQUxMX0xPV0VSQ0FTRSB9IGZyb20gXCIuL3JvdXRlci5qc1wiO1xuaW1wb3J0IHsgQ09NUE9TRURfSEFORExFUiB9IGZyb20gXCIuL3V0aWxzL2NvbnN0YW50cy5qc1wiO1xuaW1wb3J0IHsgZ2V0UGF0aCwgZ2V0UGF0aE5vU3RyaWN0LCBtZXJnZVBhdGggfSBmcm9tIFwiLi91dGlscy91cmwuanNcIjtcbnZhciBub3RGb3VuZEhhbmRsZXIgPSAoYykgPT4ge1xuICByZXR1cm4gYy50ZXh0KFwiNDA0IE5vdCBGb3VuZFwiLCA0MDQpO1xufTtcbnZhciBlcnJvckhhbmRsZXIgPSAoZXJyLCBjKSA9PiB7XG4gIGlmIChcImdldFJlc3BvbnNlXCIgaW4gZXJyKSB7XG4gICAgY29uc3QgcmVzID0gZXJyLmdldFJlc3BvbnNlKCk7XG4gICAgcmV0dXJuIGMubmV3UmVzcG9uc2UocmVzLmJvZHksIHJlcyk7XG4gIH1cbiAgY29uc29sZS5lcnJvcihlcnIpO1xuICByZXR1cm4gYy50ZXh0KFwiSW50ZXJuYWwgU2VydmVyIEVycm9yXCIsIDUwMCk7XG59O1xudmFyIEhvbm8gPSBjbGFzcyB7XG4gIGdldDtcbiAgcG9zdDtcbiAgcHV0O1xuICBkZWxldGU7XG4gIG9wdGlvbnM7XG4gIHBhdGNoO1xuICBhbGw7XG4gIG9uO1xuICB1c2U7XG4gIHJvdXRlcjtcbiAgZ2V0UGF0aDtcbiAgX2Jhc2VQYXRoID0gXCIvXCI7XG4gICNwYXRoID0gXCIvXCI7XG4gIHJvdXRlcyA9IFtdO1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBhbGxNZXRob2RzID0gWy4uLk1FVEhPRFMsIE1FVEhPRF9OQU1FX0FMTF9MT1dFUkNBU0VdO1xuICAgIGFsbE1ldGhvZHMuZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAoYXJnczEsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmdzMSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHRoaXMuI3BhdGggPSBhcmdzMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLiNhZGRSb3V0ZShtZXRob2QsIHRoaXMuI3BhdGgsIGFyZ3MxKTtcbiAgICAgICAgfVxuICAgICAgICBhcmdzLmZvckVhY2goKGhhbmRsZXIpID0+IHtcbiAgICAgICAgICB0aGlzLiNhZGRSb3V0ZShtZXRob2QsIHRoaXMuI3BhdGgsIGhhbmRsZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuICAgIHRoaXMub24gPSAobWV0aG9kLCBwYXRoLCAuLi5oYW5kbGVycykgPT4ge1xuICAgICAgZm9yIChjb25zdCBwIG9mIFtwYXRoXS5mbGF0KCkpIHtcbiAgICAgICAgdGhpcy4jcGF0aCA9IHA7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiBbbWV0aG9kXS5mbGF0KCkpIHtcbiAgICAgICAgICBoYW5kbGVycy5tYXAoKGhhbmRsZXIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuI2FkZFJvdXRlKG0udG9VcHBlckNhc2UoKSwgdGhpcy4jcGF0aCwgaGFuZGxlcik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgdGhpcy51c2UgPSAoYXJnMSwgLi4uaGFuZGxlcnMpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgYXJnMSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0aGlzLiNwYXRoID0gYXJnMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuI3BhdGggPSBcIipcIjtcbiAgICAgICAgaGFuZGxlcnMudW5zaGlmdChhcmcxKTtcbiAgICAgIH1cbiAgICAgIGhhbmRsZXJzLmZvckVhY2goKGhhbmRsZXIpID0+IHtcbiAgICAgICAgdGhpcy4jYWRkUm91dGUoTUVUSE9EX05BTUVfQUxMLCB0aGlzLiNwYXRoLCBoYW5kbGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBjb25zdCB7IHN0cmljdCwgLi4ub3B0aW9uc1dpdGhvdXRTdHJpY3QgfSA9IG9wdGlvbnM7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBvcHRpb25zV2l0aG91dFN0cmljdCk7XG4gICAgdGhpcy5nZXRQYXRoID0gc3RyaWN0ID8/IHRydWUgPyBvcHRpb25zLmdldFBhdGggPz8gZ2V0UGF0aCA6IGdldFBhdGhOb1N0cmljdDtcbiAgfVxuICAjY2xvbmUoKSB7XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSG9ubyh7XG4gICAgICByb3V0ZXI6IHRoaXMucm91dGVyLFxuICAgICAgZ2V0UGF0aDogdGhpcy5nZXRQYXRoXG4gICAgfSk7XG4gICAgY2xvbmUuZXJyb3JIYW5kbGVyID0gdGhpcy5lcnJvckhhbmRsZXI7XG4gICAgY2xvbmUuI25vdEZvdW5kSGFuZGxlciA9IHRoaXMuI25vdEZvdW5kSGFuZGxlcjtcbiAgICBjbG9uZS5yb3V0ZXMgPSB0aGlzLnJvdXRlcztcbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cbiAgI25vdEZvdW5kSGFuZGxlciA9IG5vdEZvdW5kSGFuZGxlcjtcbiAgZXJyb3JIYW5kbGVyID0gZXJyb3JIYW5kbGVyO1xuICByb3V0ZShwYXRoLCBhcHApIHtcbiAgICBjb25zdCBzdWJBcHAgPSB0aGlzLmJhc2VQYXRoKHBhdGgpO1xuICAgIGFwcC5yb3V0ZXMubWFwKChyKSA9PiB7XG4gICAgICBsZXQgaGFuZGxlcjtcbiAgICAgIGlmIChhcHAuZXJyb3JIYW5kbGVyID09PSBlcnJvckhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlciA9IHIuaGFuZGxlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhhbmRsZXIgPSBhc3luYyAoYywgbmV4dCkgPT4gKGF3YWl0IGNvbXBvc2UoW10sIGFwcC5lcnJvckhhbmRsZXIpKGMsICgpID0+IHIuaGFuZGxlcihjLCBuZXh0KSkpLnJlcztcbiAgICAgICAgaGFuZGxlcltDT01QT1NFRF9IQU5ETEVSXSA9IHIuaGFuZGxlcjtcbiAgICAgIH1cbiAgICAgIHN1YkFwcC4jYWRkUm91dGUoci5tZXRob2QsIHIucGF0aCwgaGFuZGxlcik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgYmFzZVBhdGgocGF0aCkge1xuICAgIGNvbnN0IHN1YkFwcCA9IHRoaXMuI2Nsb25lKCk7XG4gICAgc3ViQXBwLl9iYXNlUGF0aCA9IG1lcmdlUGF0aCh0aGlzLl9iYXNlUGF0aCwgcGF0aCk7XG4gICAgcmV0dXJuIHN1YkFwcDtcbiAgfVxuICBvbkVycm9yID0gKGhhbmRsZXIpID0+IHtcbiAgICB0aGlzLmVycm9ySGFuZGxlciA9IGhhbmRsZXI7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG4gIG5vdEZvdW5kID0gKGhhbmRsZXIpID0+IHtcbiAgICB0aGlzLiNub3RGb3VuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuICBtb3VudChwYXRoLCBhcHBsaWNhdGlvbkhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBsZXQgcmVwbGFjZVJlcXVlc3Q7XG4gICAgbGV0IG9wdGlvbkhhbmRsZXI7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIG9wdGlvbkhhbmRsZXIgPSBvcHRpb25zO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9uSGFuZGxlciA9IG9wdGlvbnMub3B0aW9uSGFuZGxlcjtcbiAgICAgICAgaWYgKG9wdGlvbnMucmVwbGFjZVJlcXVlc3QgPT09IGZhbHNlKSB7XG4gICAgICAgICAgcmVwbGFjZVJlcXVlc3QgPSAocmVxdWVzdCkgPT4gcmVxdWVzdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXBsYWNlUmVxdWVzdCA9IG9wdGlvbnMucmVwbGFjZVJlcXVlc3Q7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZ2V0T3B0aW9ucyA9IG9wdGlvbkhhbmRsZXIgPyAoYykgPT4ge1xuICAgICAgY29uc3Qgb3B0aW9uczIgPSBvcHRpb25IYW5kbGVyKGMpO1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkob3B0aW9uczIpID8gb3B0aW9uczIgOiBbb3B0aW9uczJdO1xuICAgIH0gOiAoYykgPT4ge1xuICAgICAgbGV0IGV4ZWN1dGlvbkNvbnRleHQgPSB2b2lkIDA7XG4gICAgICB0cnkge1xuICAgICAgICBleGVjdXRpb25Db250ZXh0ID0gYy5leGVjdXRpb25DdHg7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbYy5lbnYsIGV4ZWN1dGlvbkNvbnRleHRdO1xuICAgIH07XG4gICAgcmVwbGFjZVJlcXVlc3QgfHw9ICgoKSA9PiB7XG4gICAgICBjb25zdCBtZXJnZWRQYXRoID0gbWVyZ2VQYXRoKHRoaXMuX2Jhc2VQYXRoLCBwYXRoKTtcbiAgICAgIGNvbnN0IHBhdGhQcmVmaXhMZW5ndGggPSBtZXJnZWRQYXRoID09PSBcIi9cIiA/IDAgOiBtZXJnZWRQYXRoLmxlbmd0aDtcbiAgICAgIHJldHVybiAocmVxdWVzdCkgPT4ge1xuICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcXVlc3QudXJsKTtcbiAgICAgICAgdXJsLnBhdGhuYW1lID0gdXJsLnBhdGhuYW1lLnNsaWNlKHBhdGhQcmVmaXhMZW5ndGgpIHx8IFwiL1wiO1xuICAgICAgICByZXR1cm4gbmV3IFJlcXVlc3QodXJsLCByZXF1ZXN0KTtcbiAgICAgIH07XG4gICAgfSkoKTtcbiAgICBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGMsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGFwcGxpY2F0aW9uSGFuZGxlcihyZXBsYWNlUmVxdWVzdChjLnJlcS5yYXcpLCAuLi5nZXRPcHRpb25zKGMpKTtcbiAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cbiAgICAgIGF3YWl0IG5leHQoKTtcbiAgICB9O1xuICAgIHRoaXMuI2FkZFJvdXRlKE1FVEhPRF9OQU1FX0FMTCwgbWVyZ2VQYXRoKHBhdGgsIFwiKlwiKSwgaGFuZGxlcik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgI2FkZFJvdXRlKG1ldGhvZCwgcGF0aCwgaGFuZGxlcikge1xuICAgIG1ldGhvZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuICAgIHBhdGggPSBtZXJnZVBhdGgodGhpcy5fYmFzZVBhdGgsIHBhdGgpO1xuICAgIGNvbnN0IHIgPSB7IGJhc2VQYXRoOiB0aGlzLl9iYXNlUGF0aCwgcGF0aCwgbWV0aG9kLCBoYW5kbGVyIH07XG4gICAgdGhpcy5yb3V0ZXIuYWRkKG1ldGhvZCwgcGF0aCwgW2hhbmRsZXIsIHJdKTtcbiAgICB0aGlzLnJvdXRlcy5wdXNoKHIpO1xuICB9XG4gICNoYW5kbGVFcnJvcihlcnIsIGMpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHJldHVybiB0aGlzLmVycm9ySGFuZGxlcihlcnIsIGMpO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cbiAgI2Rpc3BhdGNoKHJlcXVlc3QsIGV4ZWN1dGlvbkN0eCwgZW52LCBtZXRob2QpIHtcbiAgICBpZiAobWV0aG9kID09PSBcIkhFQURcIikge1xuICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiBuZXcgUmVzcG9uc2UobnVsbCwgYXdhaXQgdGhpcy4jZGlzcGF0Y2gocmVxdWVzdCwgZXhlY3V0aW9uQ3R4LCBlbnYsIFwiR0VUXCIpKSkoKTtcbiAgICB9XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuZ2V0UGF0aChyZXF1ZXN0LCB7IGVudiB9KTtcbiAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHRoaXMucm91dGVyLm1hdGNoKG1ldGhvZCwgcGF0aCk7XG4gICAgY29uc3QgYyA9IG5ldyBDb250ZXh0KHJlcXVlc3QsIHtcbiAgICAgIHBhdGgsXG4gICAgICBtYXRjaFJlc3VsdCxcbiAgICAgIGVudixcbiAgICAgIGV4ZWN1dGlvbkN0eCxcbiAgICAgIG5vdEZvdW5kSGFuZGxlcjogdGhpcy4jbm90Rm91bmRIYW5kbGVyXG4gICAgfSk7XG4gICAgaWYgKG1hdGNoUmVzdWx0WzBdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGV0IHJlcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcyA9IG1hdGNoUmVzdWx0WzBdWzBdWzBdWzBdKGMsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjLnJlcyA9IGF3YWl0IHRoaXMuI25vdEZvdW5kSGFuZGxlcihjKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuI2hhbmRsZUVycm9yKGVyciwgYyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzIGluc3RhbmNlb2YgUHJvbWlzZSA/IHJlcy50aGVuKFxuICAgICAgICAocmVzb2x2ZWQpID0+IHJlc29sdmVkIHx8IChjLmZpbmFsaXplZCA/IGMucmVzIDogdGhpcy4jbm90Rm91bmRIYW5kbGVyKGMpKVxuICAgICAgKS5jYXRjaCgoZXJyKSA9PiB0aGlzLiNoYW5kbGVFcnJvcihlcnIsIGMpKSA6IHJlcyA/PyB0aGlzLiNub3RGb3VuZEhhbmRsZXIoYyk7XG4gICAgfVxuICAgIGNvbnN0IGNvbXBvc2VkID0gY29tcG9zZShtYXRjaFJlc3VsdFswXSwgdGhpcy5lcnJvckhhbmRsZXIsIHRoaXMuI25vdEZvdW5kSGFuZGxlcik7XG4gICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgY29tcG9zZWQoYyk7XG4gICAgICAgIGlmICghY29udGV4dC5maW5hbGl6ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkNvbnRleHQgaXMgbm90IGZpbmFsaXplZC4gRGlkIHlvdSBmb3JnZXQgdG8gcmV0dXJuIGEgUmVzcG9uc2Ugb2JqZWN0IG9yIGBhd2FpdCBuZXh0KClgP1wiXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5yZXM7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuI2hhbmRsZUVycm9yKGVyciwgYyk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgfVxuICBmZXRjaCA9IChyZXF1ZXN0LCAuLi5yZXN0KSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuI2Rpc3BhdGNoKHJlcXVlc3QsIHJlc3RbMV0sIHJlc3RbMF0sIHJlcXVlc3QubWV0aG9kKTtcbiAgfTtcbiAgcmVxdWVzdCA9IChpbnB1dCwgcmVxdWVzdEluaXQsIEVudiwgZXhlY3V0aW9uQ3R4KSA9PiB7XG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmV0Y2gocmVxdWVzdEluaXQgPyBuZXcgUmVxdWVzdChpbnB1dCwgcmVxdWVzdEluaXQpIDogaW5wdXQsIEVudiwgZXhlY3V0aW9uQ3R4KTtcbiAgICB9XG4gICAgaW5wdXQgPSBpbnB1dC50b1N0cmluZygpO1xuICAgIHJldHVybiB0aGlzLmZldGNoKFxuICAgICAgbmV3IFJlcXVlc3QoXG4gICAgICAgIC9eaHR0cHM/OlxcL1xcLy8udGVzdChpbnB1dCkgPyBpbnB1dCA6IGBodHRwOi8vbG9jYWxob3N0JHttZXJnZVBhdGgoXCIvXCIsIGlucHV0KX1gLFxuICAgICAgICByZXF1ZXN0SW5pdFxuICAgICAgKSxcbiAgICAgIEVudixcbiAgICAgIGV4ZWN1dGlvbkN0eFxuICAgICk7XG4gIH07XG4gIGZpcmUgPSAoKSA9PiB7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsIChldmVudCkgPT4ge1xuICAgICAgZXZlbnQucmVzcG9uZFdpdGgodGhpcy4jZGlzcGF0Y2goZXZlbnQucmVxdWVzdCwgZXZlbnQsIHZvaWQgMCwgZXZlbnQucmVxdWVzdC5tZXRob2QpKTtcbiAgICB9KTtcbiAgfTtcbn07XG5leHBvcnQge1xuICBIb25vIGFzIEhvbm9CYXNlXG59O1xuIiwgIi8vIHNyYy9yb3V0ZXIvcmVnLWV4cC1yb3V0ZXIvbm9kZS50c1xudmFyIExBQkVMX1JFR19FWFBfU1RSID0gXCJbXi9dK1wiO1xudmFyIE9OTFlfV0lMRENBUkRfUkVHX0VYUF9TVFIgPSBcIi4qXCI7XG52YXIgVEFJTF9XSUxEQ0FSRF9SRUdfRVhQX1NUUiA9IFwiKD86fC8uKilcIjtcbnZhciBQQVRIX0VSUk9SID0gU3ltYm9sKCk7XG52YXIgcmVnRXhwTWV0YUNoYXJzID0gbmV3IFNldChcIi5cXFxcKypbXl0kKClcIik7XG5mdW5jdGlvbiBjb21wYXJlS2V5KGEsIGIpIHtcbiAgaWYgKGEubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGIubGVuZ3RoID09PSAxID8gYSA8IGIgPyAtMSA6IDEgOiAtMTtcbiAgfVxuICBpZiAoYi5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICBpZiAoYSA9PT0gT05MWV9XSUxEQ0FSRF9SRUdfRVhQX1NUUiB8fCBhID09PSBUQUlMX1dJTERDQVJEX1JFR19FWFBfU1RSKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0gZWxzZSBpZiAoYiA9PT0gT05MWV9XSUxEQ0FSRF9SRUdfRVhQX1NUUiB8fCBiID09PSBUQUlMX1dJTERDQVJEX1JFR19FWFBfU1RSKSB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIGlmIChhID09PSBMQUJFTF9SRUdfRVhQX1NUUikge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2UgaWYgKGIgPT09IExBQkVMX1JFR19FWFBfU1RSKSB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIHJldHVybiBhLmxlbmd0aCA9PT0gYi5sZW5ndGggPyBhIDwgYiA/IC0xIDogMSA6IGIubGVuZ3RoIC0gYS5sZW5ndGg7XG59XG52YXIgTm9kZSA9IGNsYXNzIHtcbiAgI2luZGV4O1xuICAjdmFySW5kZXg7XG4gICNjaGlsZHJlbiA9IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBpbnNlcnQodG9rZW5zLCBpbmRleCwgcGFyYW1NYXAsIGNvbnRleHQsIHBhdGhFcnJvckNoZWNrT25seSkge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAodGhpcy4jaW5kZXggIT09IHZvaWQgMCkge1xuICAgICAgICB0aHJvdyBQQVRIX0VSUk9SO1xuICAgICAgfVxuICAgICAgaWYgKHBhdGhFcnJvckNoZWNrT25seSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLiNpbmRleCA9IGluZGV4O1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBbdG9rZW4sIC4uLnJlc3RUb2tlbnNdID0gdG9rZW5zO1xuICAgIGNvbnN0IHBhdHRlcm4gPSB0b2tlbiA9PT0gXCIqXCIgPyByZXN0VG9rZW5zLmxlbmd0aCA9PT0gMCA/IFtcIlwiLCBcIlwiLCBPTkxZX1dJTERDQVJEX1JFR19FWFBfU1RSXSA6IFtcIlwiLCBcIlwiLCBMQUJFTF9SRUdfRVhQX1NUUl0gOiB0b2tlbiA9PT0gXCIvKlwiID8gW1wiXCIsIFwiXCIsIFRBSUxfV0lMRENBUkRfUkVHX0VYUF9TVFJdIDogdG9rZW4ubWF0Y2goL15cXDooW15cXHtcXH1dKykoPzpcXHsoLispXFx9KT8kLyk7XG4gICAgbGV0IG5vZGU7XG4gICAgaWYgKHBhdHRlcm4pIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwYXR0ZXJuWzFdO1xuICAgICAgbGV0IHJlZ2V4cFN0ciA9IHBhdHRlcm5bMl0gfHwgTEFCRUxfUkVHX0VYUF9TVFI7XG4gICAgICBpZiAobmFtZSAmJiBwYXR0ZXJuWzJdKSB7XG4gICAgICAgIHJlZ2V4cFN0ciA9IHJlZ2V4cFN0ci5yZXBsYWNlKC9eXFwoKD8hXFw/OikoPz1bXildK1xcKSQpLywgXCIoPzpcIik7XG4gICAgICAgIGlmICgvXFwoKD8hXFw/OikvLnRlc3QocmVnZXhwU3RyKSkge1xuICAgICAgICAgIHRocm93IFBBVEhfRVJST1I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5vZGUgPSB0aGlzLiNjaGlsZHJlbltyZWdleHBTdHJdO1xuICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLiNjaGlsZHJlbikuc29tZShcbiAgICAgICAgICAoaykgPT4gayAhPT0gT05MWV9XSUxEQ0FSRF9SRUdfRVhQX1NUUiAmJiBrICE9PSBUQUlMX1dJTERDQVJEX1JFR19FWFBfU1RSXG4gICAgICAgICkpIHtcbiAgICAgICAgICB0aHJvdyBQQVRIX0VSUk9SO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoRXJyb3JDaGVja09ubHkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IHRoaXMuI2NoaWxkcmVuW3JlZ2V4cFN0cl0gPSBuZXcgTm9kZSgpO1xuICAgICAgICBpZiAobmFtZSAhPT0gXCJcIikge1xuICAgICAgICAgIG5vZGUuI3ZhckluZGV4ID0gY29udGV4dC52YXJJbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGhFcnJvckNoZWNrT25seSAmJiBuYW1lICE9PSBcIlwiKSB7XG4gICAgICAgIHBhcmFtTWFwLnB1c2goW25hbWUsIG5vZGUuI3ZhckluZGV4XSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUgPSB0aGlzLiNjaGlsZHJlblt0b2tlbl07XG4gICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuI2NoaWxkcmVuKS5zb21lKFxuICAgICAgICAgIChrKSA9PiBrLmxlbmd0aCA+IDEgJiYgayAhPT0gT05MWV9XSUxEQ0FSRF9SRUdfRVhQX1NUUiAmJiBrICE9PSBUQUlMX1dJTERDQVJEX1JFR19FWFBfU1RSXG4gICAgICAgICkpIHtcbiAgICAgICAgICB0aHJvdyBQQVRIX0VSUk9SO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoRXJyb3JDaGVja09ubHkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IHRoaXMuI2NoaWxkcmVuW3Rva2VuXSA9IG5ldyBOb2RlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIG5vZGUuaW5zZXJ0KHJlc3RUb2tlbnMsIGluZGV4LCBwYXJhbU1hcCwgY29udGV4dCwgcGF0aEVycm9yQ2hlY2tPbmx5KTtcbiAgfVxuICBidWlsZFJlZ0V4cFN0cigpIHtcbiAgICBjb25zdCBjaGlsZEtleXMgPSBPYmplY3Qua2V5cyh0aGlzLiNjaGlsZHJlbikuc29ydChjb21wYXJlS2V5KTtcbiAgICBjb25zdCBzdHJMaXN0ID0gY2hpbGRLZXlzLm1hcCgoaykgPT4ge1xuICAgICAgY29uc3QgYyA9IHRoaXMuI2NoaWxkcmVuW2tdO1xuICAgICAgcmV0dXJuICh0eXBlb2YgYy4jdmFySW5kZXggPT09IFwibnVtYmVyXCIgPyBgKCR7a30pQCR7Yy4jdmFySW5kZXh9YCA6IHJlZ0V4cE1ldGFDaGFycy5oYXMoaykgPyBgXFxcXCR7a31gIDogaykgKyBjLmJ1aWxkUmVnRXhwU3RyKCk7XG4gICAgfSk7XG4gICAgaWYgKHR5cGVvZiB0aGlzLiNpbmRleCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgc3RyTGlzdC51bnNoaWZ0KGAjJHt0aGlzLiNpbmRleH1gKTtcbiAgICB9XG4gICAgaWYgKHN0ckxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gICAgaWYgKHN0ckxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gc3RyTGlzdFswXTtcbiAgICB9XG4gICAgcmV0dXJuIFwiKD86XCIgKyBzdHJMaXN0LmpvaW4oXCJ8XCIpICsgXCIpXCI7XG4gIH1cbn07XG5leHBvcnQge1xuICBOb2RlLFxuICBQQVRIX0VSUk9SXG59O1xuIiwgIi8vIHNyYy9yb3V0ZXIvcmVnLWV4cC1yb3V0ZXIvdHJpZS50c1xuaW1wb3J0IHsgTm9kZSB9IGZyb20gXCIuL25vZGUuanNcIjtcbnZhciBUcmllID0gY2xhc3Mge1xuICAjY29udGV4dCA9IHsgdmFySW5kZXg6IDAgfTtcbiAgI3Jvb3QgPSBuZXcgTm9kZSgpO1xuICBpbnNlcnQocGF0aCwgaW5kZXgsIHBhdGhFcnJvckNoZWNrT25seSkge1xuICAgIGNvbnN0IHBhcmFtQXNzb2MgPSBbXTtcbiAgICBjb25zdCBncm91cHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgOyApIHtcbiAgICAgIGxldCByZXBsYWNlZCA9IGZhbHNlO1xuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFx7W159XStcXH0vZywgKG0pID0+IHtcbiAgICAgICAgY29uc3QgbWFyayA9IGBAXFxcXCR7aX1gO1xuICAgICAgICBncm91cHNbaV0gPSBbbWFyaywgbV07XG4gICAgICAgIGkrKztcbiAgICAgICAgcmVwbGFjZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gbWFyaztcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXBsYWNlZCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdG9rZW5zID0gcGF0aC5tYXRjaCgvKD86OlteXFwvXSspfCg/OlxcL1xcKiQpfC4vZykgfHwgW107XG4gICAgZm9yIChsZXQgaSA9IGdyb3Vwcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgW21hcmtdID0gZ3JvdXBzW2ldO1xuICAgICAgZm9yIChsZXQgaiA9IHRva2Vucy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICBpZiAodG9rZW5zW2pdLmluZGV4T2YobWFyaykgIT09IC0xKSB7XG4gICAgICAgICAgdG9rZW5zW2pdID0gdG9rZW5zW2pdLnJlcGxhY2UobWFyaywgZ3JvdXBzW2ldWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiNyb290Lmluc2VydCh0b2tlbnMsIGluZGV4LCBwYXJhbUFzc29jLCB0aGlzLiNjb250ZXh0LCBwYXRoRXJyb3JDaGVja09ubHkpO1xuICAgIHJldHVybiBwYXJhbUFzc29jO1xuICB9XG4gIGJ1aWxkUmVnRXhwKCkge1xuICAgIGxldCByZWdleHAgPSB0aGlzLiNyb290LmJ1aWxkUmVnRXhwU3RyKCk7XG4gICAgaWYgKHJlZ2V4cCA9PT0gXCJcIikge1xuICAgICAgcmV0dXJuIFsvXiQvLCBbXSwgW11dO1xuICAgIH1cbiAgICBsZXQgY2FwdHVyZUluZGV4ID0gMDtcbiAgICBjb25zdCBpbmRleFJlcGxhY2VtZW50TWFwID0gW107XG4gICAgY29uc3QgcGFyYW1SZXBsYWNlbWVudE1hcCA9IFtdO1xuICAgIHJlZ2V4cCA9IHJlZ2V4cC5yZXBsYWNlKC8jKFxcZCspfEAoXFxkKyl8XFwuXFwqXFwkL2csIChfLCBoYW5kbGVySW5kZXgsIHBhcmFtSW5kZXgpID0+IHtcbiAgICAgIGlmIChoYW5kbGVySW5kZXggIT09IHZvaWQgMCkge1xuICAgICAgICBpbmRleFJlcGxhY2VtZW50TWFwWysrY2FwdHVyZUluZGV4XSA9IE51bWJlcihoYW5kbGVySW5kZXgpO1xuICAgICAgICByZXR1cm4gXCIkKClcIjtcbiAgICAgIH1cbiAgICAgIGlmIChwYXJhbUluZGV4ICE9PSB2b2lkIDApIHtcbiAgICAgICAgcGFyYW1SZXBsYWNlbWVudE1hcFtOdW1iZXIocGFyYW1JbmRleCldID0gKytjYXB0dXJlSW5kZXg7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtuZXcgUmVnRXhwKGBeJHtyZWdleHB9YCksIGluZGV4UmVwbGFjZW1lbnRNYXAsIHBhcmFtUmVwbGFjZW1lbnRNYXBdO1xuICB9XG59O1xuZXhwb3J0IHtcbiAgVHJpZVxufTtcbiIsICIvLyBzcmMvcm91dGVyL3JlZy1leHAtcm91dGVyL3JvdXRlci50c1xuaW1wb3J0IHtcbiAgTUVTU0FHRV9NQVRDSEVSX0lTX0FMUkVBRFlfQlVJTFQsXG4gIE1FVEhPRF9OQU1FX0FMTCxcbiAgVW5zdXBwb3J0ZWRQYXRoRXJyb3Jcbn0gZnJvbSBcIi4uLy4uL3JvdXRlci5qc1wiO1xuaW1wb3J0IHsgY2hlY2tPcHRpb25hbFBhcmFtZXRlciB9IGZyb20gXCIuLi8uLi91dGlscy91cmwuanNcIjtcbmltcG9ydCB7IFBBVEhfRVJST1IgfSBmcm9tIFwiLi9ub2RlLmpzXCI7XG5pbXBvcnQgeyBUcmllIH0gZnJvbSBcIi4vdHJpZS5qc1wiO1xudmFyIGVtcHR5UGFyYW0gPSBbXTtcbnZhciBudWxsTWF0Y2hlciA9IFsvXiQvLCBbXSwgLyogQF9fUFVSRV9fICovIE9iamVjdC5jcmVhdGUobnVsbCldO1xudmFyIHdpbGRjYXJkUmVnRXhwQ2FjaGUgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbmZ1bmN0aW9uIGJ1aWxkV2lsZGNhcmRSZWdFeHAocGF0aCkge1xuICByZXR1cm4gd2lsZGNhcmRSZWdFeHBDYWNoZVtwYXRoXSA/Pz0gbmV3IFJlZ0V4cChcbiAgICBwYXRoID09PSBcIipcIiA/IFwiXCIgOiBgXiR7cGF0aC5yZXBsYWNlKFxuICAgICAgL1xcL1xcKiR8KFsuXFxcXCsqW15cXF0kKCldKS9nLFxuICAgICAgKF8sIG1ldGFDaGFyKSA9PiBtZXRhQ2hhciA/IGBcXFxcJHttZXRhQ2hhcn1gIDogXCIoPzp8Ly4qKVwiXG4gICAgKX0kYFxuICApO1xufVxuZnVuY3Rpb24gY2xlYXJXaWxkY2FyZFJlZ0V4cENhY2hlKCkge1xuICB3aWxkY2FyZFJlZ0V4cENhY2hlID0gLyogQF9fUFVSRV9fICovIE9iamVjdC5jcmVhdGUobnVsbCk7XG59XG5mdW5jdGlvbiBidWlsZE1hdGNoZXJGcm9tUHJlcHJvY2Vzc2VkUm91dGVzKHJvdXRlcykge1xuICBjb25zdCB0cmllID0gbmV3IFRyaWUoKTtcbiAgY29uc3QgaGFuZGxlckRhdGEgPSBbXTtcbiAgaWYgKHJvdXRlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbE1hdGNoZXI7XG4gIH1cbiAgY29uc3Qgcm91dGVzV2l0aFN0YXRpY1BhdGhGbGFnID0gcm91dGVzLm1hcChcbiAgICAocm91dGUpID0+IFshL1xcKnxcXC86Ly50ZXN0KHJvdXRlWzBdKSwgLi4ucm91dGVdXG4gICkuc29ydChcbiAgICAoW2lzU3RhdGljQSwgcGF0aEFdLCBbaXNTdGF0aWNCLCBwYXRoQl0pID0+IGlzU3RhdGljQSA/IDEgOiBpc1N0YXRpY0IgPyAtMSA6IHBhdGhBLmxlbmd0aCAtIHBhdGhCLmxlbmd0aFxuICApO1xuICBjb25zdCBzdGF0aWNNYXAgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZm9yIChsZXQgaSA9IDAsIGogPSAtMSwgbGVuID0gcm91dGVzV2l0aFN0YXRpY1BhdGhGbGFnLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY29uc3QgW3BhdGhFcnJvckNoZWNrT25seSwgcGF0aCwgaGFuZGxlcnNdID0gcm91dGVzV2l0aFN0YXRpY1BhdGhGbGFnW2ldO1xuICAgIGlmIChwYXRoRXJyb3JDaGVja09ubHkpIHtcbiAgICAgIHN0YXRpY01hcFtwYXRoXSA9IFtoYW5kbGVycy5tYXAoKFtoXSkgPT4gW2gsIC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpXSksIGVtcHR5UGFyYW1dO1xuICAgIH0gZWxzZSB7XG4gICAgICBqKys7XG4gICAgfVxuICAgIGxldCBwYXJhbUFzc29jO1xuICAgIHRyeSB7XG4gICAgICBwYXJhbUFzc29jID0gdHJpZS5pbnNlcnQocGF0aCwgaiwgcGF0aEVycm9yQ2hlY2tPbmx5KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBlID09PSBQQVRIX0VSUk9SID8gbmV3IFVuc3VwcG9ydGVkUGF0aEVycm9yKHBhdGgpIDogZTtcbiAgICB9XG4gICAgaWYgKHBhdGhFcnJvckNoZWNrT25seSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGhhbmRsZXJEYXRhW2pdID0gaGFuZGxlcnMubWFwKChbaCwgcGFyYW1Db3VudF0pID0+IHtcbiAgICAgIGNvbnN0IHBhcmFtSW5kZXhNYXAgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIHBhcmFtQ291bnQgLT0gMTtcbiAgICAgIGZvciAoOyBwYXJhbUNvdW50ID49IDA7IHBhcmFtQ291bnQtLSkge1xuICAgICAgICBjb25zdCBba2V5LCB2YWx1ZV0gPSBwYXJhbUFzc29jW3BhcmFtQ291bnRdO1xuICAgICAgICBwYXJhbUluZGV4TWFwW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbaCwgcGFyYW1JbmRleE1hcF07XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgW3JlZ2V4cCwgaW5kZXhSZXBsYWNlbWVudE1hcCwgcGFyYW1SZXBsYWNlbWVudE1hcF0gPSB0cmllLmJ1aWxkUmVnRXhwKCk7XG4gIGZvciAobGV0IGkgPSAwLCBsZW4gPSBoYW5kbGVyRGF0YS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZvciAobGV0IGogPSAwLCBsZW4yID0gaGFuZGxlckRhdGFbaV0ubGVuZ3RoOyBqIDwgbGVuMjsgaisrKSB7XG4gICAgICBjb25zdCBtYXAgPSBoYW5kbGVyRGF0YVtpXVtqXT8uWzFdO1xuICAgICAgaWYgKCFtYXApIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobWFwKTtcbiAgICAgIGZvciAobGV0IGsgPSAwLCBsZW4zID0ga2V5cy5sZW5ndGg7IGsgPCBsZW4zOyBrKyspIHtcbiAgICAgICAgbWFwW2tleXNba11dID0gcGFyYW1SZXBsYWNlbWVudE1hcFttYXBba2V5c1trXV1dO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBjb25zdCBoYW5kbGVyTWFwID0gW107XG4gIGZvciAoY29uc3QgaSBpbiBpbmRleFJlcGxhY2VtZW50TWFwKSB7XG4gICAgaGFuZGxlck1hcFtpXSA9IGhhbmRsZXJEYXRhW2luZGV4UmVwbGFjZW1lbnRNYXBbaV1dO1xuICB9XG4gIHJldHVybiBbcmVnZXhwLCBoYW5kbGVyTWFwLCBzdGF0aWNNYXBdO1xufVxuZnVuY3Rpb24gZmluZE1pZGRsZXdhcmUobWlkZGxld2FyZSwgcGF0aCkge1xuICBpZiAoIW1pZGRsZXdhcmUpIHtcbiAgICByZXR1cm4gdm9pZCAwO1xuICB9XG4gIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhtaWRkbGV3YXJlKS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKSkge1xuICAgIGlmIChidWlsZFdpbGRjYXJkUmVnRXhwKGspLnRlc3QocGF0aCkpIHtcbiAgICAgIHJldHVybiBbLi4ubWlkZGxld2FyZVtrXV07XG4gICAgfVxuICB9XG4gIHJldHVybiB2b2lkIDA7XG59XG52YXIgUmVnRXhwUm91dGVyID0gY2xhc3Mge1xuICBuYW1lID0gXCJSZWdFeHBSb3V0ZXJcIjtcbiAgI21pZGRsZXdhcmU7XG4gICNyb3V0ZXM7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuI21pZGRsZXdhcmUgPSB7IFtNRVRIT0RfTkFNRV9BTExdOiAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKSB9O1xuICAgIHRoaXMuI3JvdXRlcyA9IHsgW01FVEhPRF9OQU1FX0FMTF06IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpIH07XG4gIH1cbiAgYWRkKG1ldGhvZCwgcGF0aCwgaGFuZGxlcikge1xuICAgIGNvbnN0IG1pZGRsZXdhcmUgPSB0aGlzLiNtaWRkbGV3YXJlO1xuICAgIGNvbnN0IHJvdXRlcyA9IHRoaXMuI3JvdXRlcztcbiAgICBpZiAoIW1pZGRsZXdhcmUgfHwgIXJvdXRlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKE1FU1NBR0VfTUFUQ0hFUl9JU19BTFJFQURZX0JVSUxUKTtcbiAgICB9XG4gICAgaWYgKCFtaWRkbGV3YXJlW21ldGhvZF0pIHtcbiAgICAgIDtcbiAgICAgIFttaWRkbGV3YXJlLCByb3V0ZXNdLmZvckVhY2goKGhhbmRsZXJNYXApID0+IHtcbiAgICAgICAgaGFuZGxlck1hcFttZXRob2RdID0gLyogQF9fUFVSRV9fICovIE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIE9iamVjdC5rZXlzKGhhbmRsZXJNYXBbTUVUSE9EX05BTUVfQUxMXSkuZm9yRWFjaCgocCkgPT4ge1xuICAgICAgICAgIGhhbmRsZXJNYXBbbWV0aG9kXVtwXSA9IFsuLi5oYW5kbGVyTWFwW01FVEhPRF9OQU1FX0FMTF1bcF1dO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAocGF0aCA9PT0gXCIvKlwiKSB7XG4gICAgICBwYXRoID0gXCIqXCI7XG4gICAgfVxuICAgIGNvbnN0IHBhcmFtQ291bnQgPSAocGF0aC5tYXRjaCgvXFwvOi9nKSB8fCBbXSkubGVuZ3RoO1xuICAgIGlmICgvXFwqJC8udGVzdChwYXRoKSkge1xuICAgICAgY29uc3QgcmUgPSBidWlsZFdpbGRjYXJkUmVnRXhwKHBhdGgpO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gTUVUSE9EX05BTUVfQUxMKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKG1pZGRsZXdhcmUpLmZvckVhY2goKG0pID0+IHtcbiAgICAgICAgICBtaWRkbGV3YXJlW21dW3BhdGhdIHx8PSBmaW5kTWlkZGxld2FyZShtaWRkbGV3YXJlW21dLCBwYXRoKSB8fCBmaW5kTWlkZGxld2FyZShtaWRkbGV3YXJlW01FVEhPRF9OQU1FX0FMTF0sIHBhdGgpIHx8IFtdO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pZGRsZXdhcmVbbWV0aG9kXVtwYXRoXSB8fD0gZmluZE1pZGRsZXdhcmUobWlkZGxld2FyZVttZXRob2RdLCBwYXRoKSB8fCBmaW5kTWlkZGxld2FyZShtaWRkbGV3YXJlW01FVEhPRF9OQU1FX0FMTF0sIHBhdGgpIHx8IFtdO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmtleXMobWlkZGxld2FyZSkuZm9yRWFjaCgobSkgPT4ge1xuICAgICAgICBpZiAobWV0aG9kID09PSBNRVRIT0RfTkFNRV9BTEwgfHwgbWV0aG9kID09PSBtKSB7XG4gICAgICAgICAgT2JqZWN0LmtleXMobWlkZGxld2FyZVttXSkuZm9yRWFjaCgocCkgPT4ge1xuICAgICAgICAgICAgcmUudGVzdChwKSAmJiBtaWRkbGV3YXJlW21dW3BdLnB1c2goW2hhbmRsZXIsIHBhcmFtQ291bnRdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBPYmplY3Qua2V5cyhyb3V0ZXMpLmZvckVhY2goKG0pID0+IHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gTUVUSE9EX05BTUVfQUxMIHx8IG1ldGhvZCA9PT0gbSkge1xuICAgICAgICAgIE9iamVjdC5rZXlzKHJvdXRlc1ttXSkuZm9yRWFjaChcbiAgICAgICAgICAgIChwKSA9PiByZS50ZXN0KHApICYmIHJvdXRlc1ttXVtwXS5wdXNoKFtoYW5kbGVyLCBwYXJhbUNvdW50XSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcGF0aHMgPSBjaGVja09wdGlvbmFsUGFyYW1ldGVyKHBhdGgpIHx8IFtwYXRoXTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gcGF0aHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IHBhdGgyID0gcGF0aHNbaV07XG4gICAgICBPYmplY3Qua2V5cyhyb3V0ZXMpLmZvckVhY2goKG0pID0+IHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gTUVUSE9EX05BTUVfQUxMIHx8IG1ldGhvZCA9PT0gbSkge1xuICAgICAgICAgIHJvdXRlc1ttXVtwYXRoMl0gfHw9IFtcbiAgICAgICAgICAgIC4uLmZpbmRNaWRkbGV3YXJlKG1pZGRsZXdhcmVbbV0sIHBhdGgyKSB8fCBmaW5kTWlkZGxld2FyZShtaWRkbGV3YXJlW01FVEhPRF9OQU1FX0FMTF0sIHBhdGgyKSB8fCBbXVxuICAgICAgICAgIF07XG4gICAgICAgICAgcm91dGVzW21dW3BhdGgyXS5wdXNoKFtoYW5kbGVyLCBwYXJhbUNvdW50IC0gbGVuICsgaSArIDFdKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIG1hdGNoKG1ldGhvZCwgcGF0aCkge1xuICAgIGNsZWFyV2lsZGNhcmRSZWdFeHBDYWNoZSgpO1xuICAgIGNvbnN0IG1hdGNoZXJzID0gdGhpcy4jYnVpbGRBbGxNYXRjaGVycygpO1xuICAgIHRoaXMubWF0Y2ggPSAobWV0aG9kMiwgcGF0aDIpID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBtYXRjaGVyc1ttZXRob2QyXSB8fCBtYXRjaGVyc1tNRVRIT0RfTkFNRV9BTExdO1xuICAgICAgY29uc3Qgc3RhdGljTWF0Y2ggPSBtYXRjaGVyWzJdW3BhdGgyXTtcbiAgICAgIGlmIChzdGF0aWNNYXRjaCkge1xuICAgICAgICByZXR1cm4gc3RhdGljTWF0Y2g7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXRjaCA9IHBhdGgyLm1hdGNoKG1hdGNoZXJbMF0pO1xuICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICByZXR1cm4gW1tdLCBlbXB0eVBhcmFtXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluZGV4ID0gbWF0Y2guaW5kZXhPZihcIlwiLCAxKTtcbiAgICAgIHJldHVybiBbbWF0Y2hlclsxXVtpbmRleF0sIG1hdGNoXTtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1hdGNoKG1ldGhvZCwgcGF0aCk7XG4gIH1cbiAgI2J1aWxkQWxsTWF0Y2hlcnMoKSB7XG4gICAgY29uc3QgbWF0Y2hlcnMgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBPYmplY3Qua2V5cyh0aGlzLiNyb3V0ZXMpLmNvbmNhdChPYmplY3Qua2V5cyh0aGlzLiNtaWRkbGV3YXJlKSkuZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICBtYXRjaGVyc1ttZXRob2RdIHx8PSB0aGlzLiNidWlsZE1hdGNoZXIobWV0aG9kKTtcbiAgICB9KTtcbiAgICB0aGlzLiNtaWRkbGV3YXJlID0gdGhpcy4jcm91dGVzID0gdm9pZCAwO1xuICAgIHJldHVybiBtYXRjaGVycztcbiAgfVxuICAjYnVpbGRNYXRjaGVyKG1ldGhvZCkge1xuICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgIGxldCBoYXNPd25Sb3V0ZSA9IG1ldGhvZCA9PT0gTUVUSE9EX05BTUVfQUxMO1xuICAgIFt0aGlzLiNtaWRkbGV3YXJlLCB0aGlzLiNyb3V0ZXNdLmZvckVhY2goKHIpID0+IHtcbiAgICAgIGNvbnN0IG93blJvdXRlID0gclttZXRob2RdID8gT2JqZWN0LmtleXMoclttZXRob2RdKS5tYXAoKHBhdGgpID0+IFtwYXRoLCByW21ldGhvZF1bcGF0aF1dKSA6IFtdO1xuICAgICAgaWYgKG93blJvdXRlLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBoYXNPd25Sb3V0ZSB8fD0gdHJ1ZTtcbiAgICAgICAgcm91dGVzLnB1c2goLi4ub3duUm91dGUpO1xuICAgICAgfSBlbHNlIGlmIChtZXRob2QgIT09IE1FVEhPRF9OQU1FX0FMTCkge1xuICAgICAgICByb3V0ZXMucHVzaChcbiAgICAgICAgICAuLi5PYmplY3Qua2V5cyhyW01FVEhPRF9OQU1FX0FMTF0pLm1hcCgocGF0aCkgPT4gW3BhdGgsIHJbTUVUSE9EX05BTUVfQUxMXVtwYXRoXV0pXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFoYXNPd25Sb3V0ZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWlsZE1hdGNoZXJGcm9tUHJlcHJvY2Vzc2VkUm91dGVzKHJvdXRlcyk7XG4gICAgfVxuICB9XG59O1xuZXhwb3J0IHtcbiAgUmVnRXhwUm91dGVyXG59O1xuIiwgIi8vIHNyYy9yb3V0ZXIvc21hcnQtcm91dGVyL3JvdXRlci50c1xuaW1wb3J0IHsgTUVTU0FHRV9NQVRDSEVSX0lTX0FMUkVBRFlfQlVJTFQsIFVuc3VwcG9ydGVkUGF0aEVycm9yIH0gZnJvbSBcIi4uLy4uL3JvdXRlci5qc1wiO1xudmFyIFNtYXJ0Um91dGVyID0gY2xhc3Mge1xuICBuYW1lID0gXCJTbWFydFJvdXRlclwiO1xuICAjcm91dGVycyA9IFtdO1xuICAjcm91dGVzID0gW107XG4gIGNvbnN0cnVjdG9yKGluaXQpIHtcbiAgICB0aGlzLiNyb3V0ZXJzID0gaW5pdC5yb3V0ZXJzO1xuICB9XG4gIGFkZChtZXRob2QsIHBhdGgsIGhhbmRsZXIpIHtcbiAgICBpZiAoIXRoaXMuI3JvdXRlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKE1FU1NBR0VfTUFUQ0hFUl9JU19BTFJFQURZX0JVSUxUKTtcbiAgICB9XG4gICAgdGhpcy4jcm91dGVzLnB1c2goW21ldGhvZCwgcGF0aCwgaGFuZGxlcl0pO1xuICB9XG4gIG1hdGNoKG1ldGhvZCwgcGF0aCkge1xuICAgIGlmICghdGhpcy4jcm91dGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYXRhbCBlcnJvclwiKTtcbiAgICB9XG4gICAgY29uc3Qgcm91dGVycyA9IHRoaXMuI3JvdXRlcnM7XG4gICAgY29uc3Qgcm91dGVzID0gdGhpcy4jcm91dGVzO1xuICAgIGNvbnN0IGxlbiA9IHJvdXRlcnMubGVuZ3RoO1xuICAgIGxldCBpID0gMDtcbiAgICBsZXQgcmVzO1xuICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IHJvdXRlciA9IHJvdXRlcnNbaV07XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKGxldCBpMiA9IDAsIGxlbjIgPSByb3V0ZXMubGVuZ3RoOyBpMiA8IGxlbjI7IGkyKyspIHtcbiAgICAgICAgICByb3V0ZXIuYWRkKC4uLnJvdXRlc1tpMl0pO1xuICAgICAgICB9XG4gICAgICAgIHJlcyA9IHJvdXRlci5tYXRjaChtZXRob2QsIHBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIFVuc3VwcG9ydGVkUGF0aEVycm9yKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICAgIHRoaXMubWF0Y2ggPSByb3V0ZXIubWF0Y2guYmluZChyb3V0ZXIpO1xuICAgICAgdGhpcy4jcm91dGVycyA9IFtyb3V0ZXJdO1xuICAgICAgdGhpcy4jcm91dGVzID0gdm9pZCAwO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChpID09PSBsZW4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhdGFsIGVycm9yXCIpO1xuICAgIH1cbiAgICB0aGlzLm5hbWUgPSBgU21hcnRSb3V0ZXIgKyAke3RoaXMuYWN0aXZlUm91dGVyLm5hbWV9YDtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIGdldCBhY3RpdmVSb3V0ZXIoKSB7XG4gICAgaWYgKHRoaXMuI3JvdXRlcyB8fCB0aGlzLiNyb3V0ZXJzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gYWN0aXZlIHJvdXRlciBoYXMgYmVlbiBkZXRlcm1pbmVkIHlldC5cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNyb3V0ZXJzWzBdO1xuICB9XG59O1xuZXhwb3J0IHtcbiAgU21hcnRSb3V0ZXJcbn07XG4iLCAiLy8gc3JjL3JvdXRlci90cmllLXJvdXRlci9ub2RlLnRzXG5pbXBvcnQgeyBNRVRIT0RfTkFNRV9BTEwgfSBmcm9tIFwiLi4vLi4vcm91dGVyLmpzXCI7XG5pbXBvcnQgeyBnZXRQYXR0ZXJuLCBzcGxpdFBhdGgsIHNwbGl0Um91dGluZ1BhdGggfSBmcm9tIFwiLi4vLi4vdXRpbHMvdXJsLmpzXCI7XG52YXIgZW1wdHlQYXJhbXMgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbnZhciBOb2RlID0gY2xhc3Mge1xuICAjbWV0aG9kcztcbiAgI2NoaWxkcmVuO1xuICAjcGF0dGVybnM7XG4gICNvcmRlciA9IDA7XG4gICNwYXJhbXMgPSBlbXB0eVBhcmFtcztcbiAgY29uc3RydWN0b3IobWV0aG9kLCBoYW5kbGVyLCBjaGlsZHJlbikge1xuICAgIHRoaXMuI2NoaWxkcmVuID0gY2hpbGRyZW4gfHwgLyogQF9fUFVSRV9fICovIE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdGhpcy4jbWV0aG9kcyA9IFtdO1xuICAgIGlmIChtZXRob2QgJiYgaGFuZGxlcikge1xuICAgICAgY29uc3QgbSA9IC8qIEBfX1BVUkVfXyAqLyBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgbVttZXRob2RdID0geyBoYW5kbGVyLCBwb3NzaWJsZUtleXM6IFtdLCBzY29yZTogMCB9O1xuICAgICAgdGhpcy4jbWV0aG9kcyA9IFttXTtcbiAgICB9XG4gICAgdGhpcy4jcGF0dGVybnMgPSBbXTtcbiAgfVxuICBpbnNlcnQobWV0aG9kLCBwYXRoLCBoYW5kbGVyKSB7XG4gICAgdGhpcy4jb3JkZXIgPSArK3RoaXMuI29yZGVyO1xuICAgIGxldCBjdXJOb2RlID0gdGhpcztcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0Um91dGluZ1BhdGgocGF0aCk7XG4gICAgY29uc3QgcG9zc2libGVLZXlzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBjb25zdCBwID0gcGFydHNbaV07XG4gICAgICBjb25zdCBuZXh0UCA9IHBhcnRzW2kgKyAxXTtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBnZXRQYXR0ZXJuKHAsIG5leHRQKTtcbiAgICAgIGNvbnN0IGtleSA9IEFycmF5LmlzQXJyYXkocGF0dGVybikgPyBwYXR0ZXJuWzBdIDogcDtcbiAgICAgIGlmIChrZXkgaW4gY3VyTm9kZS4jY2hpbGRyZW4pIHtcbiAgICAgICAgY3VyTm9kZSA9IGN1ck5vZGUuI2NoaWxkcmVuW2tleV07XG4gICAgICAgIGlmIChwYXR0ZXJuKSB7XG4gICAgICAgICAgcG9zc2libGVLZXlzLnB1c2gocGF0dGVyblsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjdXJOb2RlLiNjaGlsZHJlbltrZXldID0gbmV3IE5vZGUoKTtcbiAgICAgIGlmIChwYXR0ZXJuKSB7XG4gICAgICAgIGN1ck5vZGUuI3BhdHRlcm5zLnB1c2gocGF0dGVybik7XG4gICAgICAgIHBvc3NpYmxlS2V5cy5wdXNoKHBhdHRlcm5bMV0pO1xuICAgICAgfVxuICAgICAgY3VyTm9kZSA9IGN1ck5vZGUuI2NoaWxkcmVuW2tleV07XG4gICAgfVxuICAgIGN1ck5vZGUuI21ldGhvZHMucHVzaCh7XG4gICAgICBbbWV0aG9kXToge1xuICAgICAgICBoYW5kbGVyLFxuICAgICAgICBwb3NzaWJsZUtleXM6IHBvc3NpYmxlS2V5cy5maWx0ZXIoKHYsIGksIGEpID0+IGEuaW5kZXhPZih2KSA9PT0gaSksXG4gICAgICAgIHNjb3JlOiB0aGlzLiNvcmRlclxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjdXJOb2RlO1xuICB9XG4gICNnZXRIYW5kbGVyU2V0cyhub2RlLCBtZXRob2QsIG5vZGVQYXJhbXMsIHBhcmFtcykge1xuICAgIGNvbnN0IGhhbmRsZXJTZXRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IG5vZGUuI21ldGhvZHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IG0gPSBub2RlLiNtZXRob2RzW2ldO1xuICAgICAgY29uc3QgaGFuZGxlclNldCA9IG1bbWV0aG9kXSB8fCBtW01FVEhPRF9OQU1FX0FMTF07XG4gICAgICBjb25zdCBwcm9jZXNzZWRTZXQgPSB7fTtcbiAgICAgIGlmIChoYW5kbGVyU2V0ICE9PSB2b2lkIDApIHtcbiAgICAgICAgaGFuZGxlclNldC5wYXJhbXMgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgaGFuZGxlclNldHMucHVzaChoYW5kbGVyU2V0KTtcbiAgICAgICAgaWYgKG5vZGVQYXJhbXMgIT09IGVtcHR5UGFyYW1zIHx8IHBhcmFtcyAmJiBwYXJhbXMgIT09IGVtcHR5UGFyYW1zKSB7XG4gICAgICAgICAgZm9yIChsZXQgaTIgPSAwLCBsZW4yID0gaGFuZGxlclNldC5wb3NzaWJsZUtleXMubGVuZ3RoOyBpMiA8IGxlbjI7IGkyKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGhhbmRsZXJTZXQucG9zc2libGVLZXlzW2kyXTtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IHByb2Nlc3NlZFNldFtoYW5kbGVyU2V0LnNjb3JlXTtcbiAgICAgICAgICAgIGhhbmRsZXJTZXQucGFyYW1zW2tleV0gPSBwYXJhbXM/LltrZXldICYmICFwcm9jZXNzZWQgPyBwYXJhbXNba2V5XSA6IG5vZGVQYXJhbXNba2V5XSA/PyBwYXJhbXM/LltrZXldO1xuICAgICAgICAgICAgcHJvY2Vzc2VkU2V0W2hhbmRsZXJTZXQuc2NvcmVdID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhhbmRsZXJTZXRzO1xuICB9XG4gIHNlYXJjaChtZXRob2QsIHBhdGgpIHtcbiAgICBjb25zdCBoYW5kbGVyU2V0cyA9IFtdO1xuICAgIHRoaXMuI3BhcmFtcyA9IGVtcHR5UGFyYW1zO1xuICAgIGNvbnN0IGN1ck5vZGUgPSB0aGlzO1xuICAgIGxldCBjdXJOb2RlcyA9IFtjdXJOb2RlXTtcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0UGF0aChwYXRoKTtcbiAgICBjb25zdCBjdXJOb2Rlc1F1ZXVlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHBhcnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBjb25zdCBwYXJ0ID0gcGFydHNbaV07XG4gICAgICBjb25zdCBpc0xhc3QgPSBpID09PSBsZW4gLSAxO1xuICAgICAgY29uc3QgdGVtcE5vZGVzID0gW107XG4gICAgICBmb3IgKGxldCBqID0gMCwgbGVuMiA9IGN1ck5vZGVzLmxlbmd0aDsgaiA8IGxlbjI7IGorKykge1xuICAgICAgICBjb25zdCBub2RlID0gY3VyTm9kZXNbal07XG4gICAgICAgIGNvbnN0IG5leHROb2RlID0gbm9kZS4jY2hpbGRyZW5bcGFydF07XG4gICAgICAgIGlmIChuZXh0Tm9kZSkge1xuICAgICAgICAgIG5leHROb2RlLiNwYXJhbXMgPSBub2RlLiNwYXJhbXM7XG4gICAgICAgICAgaWYgKGlzTGFzdCkge1xuICAgICAgICAgICAgaWYgKG5leHROb2RlLiNjaGlsZHJlbltcIipcIl0pIHtcbiAgICAgICAgICAgICAgaGFuZGxlclNldHMucHVzaChcbiAgICAgICAgICAgICAgICAuLi50aGlzLiNnZXRIYW5kbGVyU2V0cyhuZXh0Tm9kZS4jY2hpbGRyZW5bXCIqXCJdLCBtZXRob2QsIG5vZGUuI3BhcmFtcylcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhhbmRsZXJTZXRzLnB1c2goLi4udGhpcy4jZ2V0SGFuZGxlclNldHMobmV4dE5vZGUsIG1ldGhvZCwgbm9kZS4jcGFyYW1zKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlbXBOb2Rlcy5wdXNoKG5leHROb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgayA9IDAsIGxlbjMgPSBub2RlLiNwYXR0ZXJucy5sZW5ndGg7IGsgPCBsZW4zOyBrKyspIHtcbiAgICAgICAgICBjb25zdCBwYXR0ZXJuID0gbm9kZS4jcGF0dGVybnNba107XG4gICAgICAgICAgY29uc3QgcGFyYW1zID0gbm9kZS4jcGFyYW1zID09PSBlbXB0eVBhcmFtcyA/IHt9IDogeyAuLi5ub2RlLiNwYXJhbXMgfTtcbiAgICAgICAgICBpZiAocGF0dGVybiA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGFzdE5vZGUgPSBub2RlLiNjaGlsZHJlbltcIipcIl07XG4gICAgICAgICAgICBpZiAoYXN0Tm9kZSkge1xuICAgICAgICAgICAgICBoYW5kbGVyU2V0cy5wdXNoKC4uLnRoaXMuI2dldEhhbmRsZXJTZXRzKGFzdE5vZGUsIG1ldGhvZCwgbm9kZS4jcGFyYW1zKSk7XG4gICAgICAgICAgICAgIGFzdE5vZGUuI3BhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgICAgICAgdGVtcE5vZGVzLnB1c2goYXN0Tm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgW2tleSwgbmFtZSwgbWF0Y2hlcl0gPSBwYXR0ZXJuO1xuICAgICAgICAgIGNvbnN0IGNoaWxkID0gbm9kZS4jY2hpbGRyZW5ba2V5XTtcbiAgICAgICAgICBjb25zdCByZXN0UGF0aFN0cmluZyA9IHBhcnRzLnNsaWNlKGkpLmpvaW4oXCIvXCIpO1xuICAgICAgICAgIGlmIChtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICBjb25zdCBtID0gbWF0Y2hlci5leGVjKHJlc3RQYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgIHBhcmFtc1tuYW1lXSA9IG1bMF07XG4gICAgICAgICAgICAgIGhhbmRsZXJTZXRzLnB1c2goLi4udGhpcy4jZ2V0SGFuZGxlclNldHMoY2hpbGQsIG1ldGhvZCwgbm9kZS4jcGFyYW1zLCBwYXJhbXMpKTtcbiAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGNoaWxkLiNjaGlsZHJlbikubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQuI3BhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRDb3VudCA9IG1bMF0ubWF0Y2goL1xcLy8pPy5sZW5ndGggPz8gMDtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRDdXJOb2RlcyA9IGN1ck5vZGVzUXVldWVbY29tcG9uZW50Q291bnRdIHx8PSBbXTtcbiAgICAgICAgICAgICAgICB0YXJnZXRDdXJOb2Rlcy5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hdGNoZXIgPT09IHRydWUgfHwgbWF0Y2hlci50ZXN0KHBhcnQpKSB7XG4gICAgICAgICAgICBwYXJhbXNbbmFtZV0gPSBwYXJ0O1xuICAgICAgICAgICAgaWYgKGlzTGFzdCkge1xuICAgICAgICAgICAgICBoYW5kbGVyU2V0cy5wdXNoKC4uLnRoaXMuI2dldEhhbmRsZXJTZXRzKGNoaWxkLCBtZXRob2QsIHBhcmFtcywgbm9kZS4jcGFyYW1zKSk7XG4gICAgICAgICAgICAgIGlmIChjaGlsZC4jY2hpbGRyZW5bXCIqXCJdKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlclNldHMucHVzaChcbiAgICAgICAgICAgICAgICAgIC4uLnRoaXMuI2dldEhhbmRsZXJTZXRzKGNoaWxkLiNjaGlsZHJlbltcIipcIl0sIG1ldGhvZCwgcGFyYW1zLCBub2RlLiNwYXJhbXMpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2hpbGQuI3BhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgICAgICAgdGVtcE5vZGVzLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY3VyTm9kZXMgPSB0ZW1wTm9kZXMuY29uY2F0KGN1ck5vZGVzUXVldWUuc2hpZnQoKSA/PyBbXSk7XG4gICAgfVxuICAgIGlmIChoYW5kbGVyU2V0cy5sZW5ndGggPiAxKSB7XG4gICAgICBoYW5kbGVyU2V0cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIHJldHVybiBhLnNjb3JlIC0gYi5zY29yZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gW2hhbmRsZXJTZXRzLm1hcCgoeyBoYW5kbGVyLCBwYXJhbXMgfSkgPT4gW2hhbmRsZXIsIHBhcmFtc10pXTtcbiAgfVxufTtcbmV4cG9ydCB7XG4gIE5vZGVcbn07XG4iLCAiLy8gc3JjL3JvdXRlci90cmllLXJvdXRlci9yb3V0ZXIudHNcbmltcG9ydCB7IGNoZWNrT3B0aW9uYWxQYXJhbWV0ZXIgfSBmcm9tIFwiLi4vLi4vdXRpbHMvdXJsLmpzXCI7XG5pbXBvcnQgeyBOb2RlIH0gZnJvbSBcIi4vbm9kZS5qc1wiO1xudmFyIFRyaWVSb3V0ZXIgPSBjbGFzcyB7XG4gIG5hbWUgPSBcIlRyaWVSb3V0ZXJcIjtcbiAgI25vZGU7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuI25vZGUgPSBuZXcgTm9kZSgpO1xuICB9XG4gIGFkZChtZXRob2QsIHBhdGgsIGhhbmRsZXIpIHtcbiAgICBjb25zdCByZXN1bHRzID0gY2hlY2tPcHRpb25hbFBhcmFtZXRlcihwYXRoKTtcbiAgICBpZiAocmVzdWx0cykge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHJlc3VsdHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdGhpcy4jbm9kZS5pbnNlcnQobWV0aG9kLCByZXN1bHRzW2ldLCBoYW5kbGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy4jbm9kZS5pbnNlcnQobWV0aG9kLCBwYXRoLCBoYW5kbGVyKTtcbiAgfVxuICBtYXRjaChtZXRob2QsIHBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy4jbm9kZS5zZWFyY2gobWV0aG9kLCBwYXRoKTtcbiAgfVxufTtcbmV4cG9ydCB7XG4gIFRyaWVSb3V0ZXJcbn07XG4iLCAiLy8gc3JjL2hvbm8udHNcbmltcG9ydCB7IEhvbm9CYXNlIH0gZnJvbSBcIi4vaG9uby1iYXNlLmpzXCI7XG5pbXBvcnQgeyBSZWdFeHBSb3V0ZXIgfSBmcm9tIFwiLi9yb3V0ZXIvcmVnLWV4cC1yb3V0ZXIvaW5kZXguanNcIjtcbmltcG9ydCB7IFNtYXJ0Um91dGVyIH0gZnJvbSBcIi4vcm91dGVyL3NtYXJ0LXJvdXRlci9pbmRleC5qc1wiO1xuaW1wb3J0IHsgVHJpZVJvdXRlciB9IGZyb20gXCIuL3JvdXRlci90cmllLXJvdXRlci9pbmRleC5qc1wiO1xudmFyIEhvbm8gPSBjbGFzcyBleHRlbmRzIEhvbm9CYXNlIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgdGhpcy5yb3V0ZXIgPSBvcHRpb25zLnJvdXRlciA/PyBuZXcgU21hcnRSb3V0ZXIoe1xuICAgICAgcm91dGVyczogW25ldyBSZWdFeHBSb3V0ZXIoKSwgbmV3IFRyaWVSb3V0ZXIoKV1cbiAgICB9KTtcbiAgfVxufTtcbmV4cG9ydCB7XG4gIEhvbm9cbn07XG4iLCAiaW1wb3J0IHsgSG9ubyB9IGZyb20gXCJob25vXCI7XG5jb25zdCBhcHAgPSBuZXcgSG9ubygpO1xuZXhwb3J0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
