import beautify from "js-beautify";

import {cutil} from "@ghasemkiani/base";
import {Obj} from "@ghasemkiani/base";
import {serializable} from "@ghasemkiani/base";
import {iwdom} from "@ghasemkiani/dom";

const NS_HTML = "http://www.w3.org/1999/xhtml";
const NS_HTML40 = "http://www.w3.org/TR/REC-html40";
const NS_SVG = "http://www.w3.org/2000/svg";
const NS_MATHML = "http://www.w3.org/1998/Math/MathML";
const chain = (arg, f, ...rest) => {
	let result;
	if (typeof f === "function") {
		result = f(arg, ...rest);
	}
	return result;
};

class Script extends cutil.mixin(Obj, serializable) {
	static {
		cutil.extend(this.prototype, {
			mime: "application/javascript",
			_items: null,
		});
	}
	get items() {
		if (cutil.na(this._items)) {
			this._items = [];
		}
		return this._items;
	}
	set items(items) {
		this._items = items;
	}
	add(f, arg) {
		this.items.push([f, arg]);
		return this;
	}
	toString() {
		const AsyncFunction = (async function () {}).constructor;
		return this.items.map(([f, arg]) => `(${f instanceof AsyncFunction ? "await " : ""}(${f.toString()})(${!cutil.isUndefined(arg) ? JSON.stringify(arg) : ""}));`).join("\n") + "\n";
	}
}

class Style extends Obj {
	static {
		cutil.extend(this.prototype, {
			_props: null,
		});
	}
	get props() {
		if (cutil.na(this._props)) {
			this._props = {};
		}
		return this._props;
	}
	set props(props) {
		this._props = props;
	}
	clear() {
		this.props = null;
	}
	add(string) {
		let pp = cutil.isObject(string) ? Object.entries(string) : cutil.asString(string).split(";").map(s => s.trim()).filter(s => !!s).map(s => {
			let [k, ...rest] = s.split(":");
			let v = rest.join(":");
			return [k, v];
		});
		for (let [k, v] of pp) {
			this.props[k] = v;
		}
		return this;
	}
	fromString(string) {
		this.add(string);
	}
	toString() {
		return Object.entries(this.props).map(([k, v]) => `${k}: ${v};`).join(" ");
	}
}

class Rule extends Obj {
	static {
		cutil.extend(this.prototype, {
			selector: null,
			_style: null,
		});
	}
	get style() {
		if (cutil.na(this._style)) {
			this._style = new Style();
		}
		return this._style;
	}
	set style(style) {
		this._style = style;
	}
	toString() {
		return `${this.selector} {${this.style.toString()}}`;
	}
}

class RuleSet extends Obj {
	static {
		cutil.extend(this.prototype, {
			selector: null,
			_ss: null,
		});
	}
	get ss() {
		if (cutil.na(this._ss)) {
			this._ss = new Stylesheet();
		}
		return this._ss;
	}
	set ss(ss) {
		this._ss = ss;
	}
	toString() {
		return `${this.selector} {${this.ss.toString()}}`;
	}
}

class Stylesheet extends cutil.mixin(Obj, serializable) {
	static {
		cutil.extend(this.prototype, {
			mime: "text/css",
			_rules: null,
		});
	}
	get rules() {
		if (cutil.na(this._rules)) {
			this._rules = [];
		}
		return this._rules;
	}
	set rules(rules) {
		this._rules = rules;
	}
	clear() {
		this.rules = null;
		return this;
	}
	add(line) {
		this.rules.push(line);
		return this;
	}
	instruction(line) {
		return this.add(line);
	}
	rule(selector, props) {
		let style = new Style({props});
		let rule = new Rule({selector, style});
		this.rules.push(rule);
		return this;
	}
	ruleset(selector, f) {
		let rs = new RuleSet({selector});
		chain(rs.ss, f);
		this.rules.push(rs);
		return this;
	}
	toString() {
		return this.rules.map(o => o.toString()).join("\n");
	}
}

class X extends cutil.mixin(Obj, iwdom) {
	static {
		cutil.extend(this, {
			NS_HTML,
			NS_HTML40,
			NS_SVG,
			NS_MATHML,
			chain,
		});
		cutil.extend(this.prototype, {
			NS_HTML,
			NS_HTML40,
			NS_SVG,
			NS_MATHML,
			chain,
			
			_window:null,
			_document: null,
			dfns: this.NS_HTML,
		});
	}
	static unescape(s) {
		s = cutil.asString(s);
		s = s.replace(/&lt;/g, "<");
		s = s.replace(/&gt;/g, ">");
		s = s.replace(/&quot;/g, '"');
		s = s.replace(/&amp;/g, "&");
		return s;
	}
	static escape(s) {
		s = cutil.asString(s);
		s = s.replace(/&/g, "&amp;");
		s = s.replace(/</g, "&lt;");
		s = s.replace(/>/g, "&gt;");
		s = s.replace(/"/g, "&quot;");
		return s;
	}
	static toCamelCase(name) {
		return !name ? "" : cutil.asString(name).replace(/\-(.)/g, function (match, letter) {
			return letter.toUpperCase();
		});
	}
	static toDashed(name) {
		return !name ? "" : cutil.asString(name).replace(/[A-Z]/g, function (match) {
			return "-" + match.toLowerCase();
		});
	}
	parseSelector(s) {
		let res = {
			tag: "",
			id: "",
			classList: [],
			cssList: [],
			attrList: [],
			text: "",
		};
		cutil.asString(s)
		.replace(/^([^$#.[{]*)/, tag => {
			res.tag = tag;
			return "";
		})
		.replace(/\{([^{]*)\}/g, (match, css) => {
			res.cssList = res.cssList.concat(css.split(/;/g).filter(bi => !!bi).map(bi => /^([^:]*):?(.*)$/.exec(bi).slice(1, 3)));
			return "";
		})
		.replace(/\[([^[]*)\]/g, (match, attr) => {
			res.attrList = res.attrList.concat(attr.split(/,/g).filter(bi => !!bi).map(bi => /^([^=]*)=?(.*)$/.exec(bi).slice(1, 3)));
			return "";
		})
		.replace(/#([^$#.[{]*)/g, (match, id) => {
			res.id = id;
			return "";
		})
		.replace(/\.([^$#.\[{]*)/g, (match, cls) => {
			res.classList.push(...cutil.asString(cls).split(/\s+/g));
			return "";
		})
		.replace(/\$(.*)$/g, (match, text) => {
			res.text = text;
			return "";
		});
		return res;
	}
	parseTag(s) {
		let x = this;
		let res = this.parseSelector(s);
		return {
			tag: res.tag,
			f: node => {
				if (res.id) {
					x.attr(node, "id", res.id);
				}
				if (res.classList.length > 0) {
					x.attr(node, "class", res.classList.join(" "));
				}
				if (res.cssList.length > 0) {
					for (let bi of res.cssList) {
						x.css(node, ...bi);
					}
				}
				if (res.attrList.length > 0) {
					for (let bi of res.attrList) {
						x.attr(node, ...bi);
					}
				}
				if (res.text) {
					x.t(node, res.text);
				}
			},
		};
	}
	win(...rest) {
		let x = this;
		if (rest.length === 0) {
			return x.window;
		} else {
			let [window] = rest;
			x.window = window;
		}
	}
	doc(...rest) {
		let x = this;
		if (rest.length === 0) {
			return x.document;
		} else {
			let [document] = rest;
			x.document = document;
		}
	}
	odoc(node) {
		return node.ownerDocument;
	}
	pnode(node) {
		return node.parentNode;
	}
	defns(...rest) {
		let x = this;
		if (rest.length === 0) {
			return x.dfns;
		} else {
			let [ns] = rest;
			x.dfns = ns;
		}
	}
	dc(tag, f) {
		let x = this;
		let {document} = x;
		let res = x.parseTag(tag);
		let node = document.createElement(res.tag);
		x.chain(node, res.f);
		x.chain(node, f);
		return node;
	}
	dcx(...rest) {
		let x = this;
		let {document} = x;
		let [tag, ns, f] = rest;
		if (rest.length === 2 && typeof ns === "function") {
			f = ns;
			ns = null;
		}
		if (cutil.isNil(ns)) {
			ns = x.defns();
		}
		let res = x.parseTag(tag);
		let node = document.createElementNS(ns, res.tag);
		x.chain(node, res.f);
		x.chain(node, f);
		return node;
	}
	dch(tag, f) {
		let x = this;
		return x.dcx(tag, X.NS_HTML, f);
	}
	dcg(tag, f) {
		let x = this;
		return x.cx(tag, X.NS_SVG, f);
	}
	dcm(tag, f) {
		let x = this;
		return x.cx(tag, X.NS_MATHML, f);
	}
	dt(text, f) {
		let x = this;
		let {document} = x;
		let node = document.createTextNode(text);
		x.chain(node, f);
		return node;
	}
	dcdata(data, f) {
		let x = this;
		let {document} = x;
		let node = document.createCDATASection(data);
		x.chain(node, f);
		return node;
	}
	dcomment(text, f) {
		let x = this;
		let {document} = x;
		let node = document.createComment(text);
		x.chain(node, f);
		return node;
	}
	c(node, ...rest) {
		let x = this;
		return x.ap(node, x.dc(...rest));
	}
	cx(node, ...rest) {
		let x = this;
		return x.ap(node, x.dcx(...rest));
	}
	ch(node, ...rest) {
		let x = this;
		return x.ap(node, x.dch(...rest));
	}
	cg(node, ...rest) {
		let x = this;
		return x.ap(node, x.dcg(...rest));
	}
	cm(node, ...rest) {
		let x = this;
		return x.ap(node, x.dcm(...rest));
	}
	t(node, ...rest) {
		let x = this;
		return x.ap(node, x.dt(...rest));
	}
	cdata(node, ...rest) {
		let x = this;
		return x.ap(node, x.dcdata(...rest));
	}
	comment(node, ...rest) {
		let x = this;
		return x.ap(node, x.dcomment(...rest));
	}
	ns(node) {
		return node.namespaceURI;
	}
	tag(node) {
		return node.tagName;
	}
	name(node) {
		return node.tagName;
	}
	pref(node) {
		return node.prefix;
	}
	nm(node) {
		return node.localName;
	}
	toStrAll(nodes) {
		let x = this;
		if(cutil.na(nodes)) {
			nodes = [];
		} else if(!cutil.isArray(nodes)) {
			nodes = [nodes];
		}
		return (nodes || []).map(node => x.toStr(node)).join("");
	}
	toText(node) {
		let x = this;
		return x.kind(node) === "processingInstruction" ? ""
			: x.kind(node) === "comment" ? ""
			: x.kind(node) === "element" ? x.toTextAll(x.nodes(node))
			: x.kind(node) === "text" ? x.toStr(node)
			: x.toStr(node);
	}
	toTextAll(nodes) {
		let x = this;
		if(cutil.na(nodes)) {
			nodes = [];
		} else if(!cutil.isArray(nodes)) {
			nodes = [nodes];
		}
		return (nodes || []).map(node => x.toText(node)).join("");
	}
	clone(node) {
		let x = this;
		return x.cloneAll([node])[0];
	}
	cloneAll(nodes) {
		let x = this;
		if(cutil.na(nodes)) {
			nodes = [];
		} else if(!cutil.isArray(nodes)) {
			nodes = [nodes];
		}
		let dummy = x.dc(x.document, "dummy");
		dummy.innerHTML = x.toStrAll(nodes);
		return x.nodes(dummy);
	}
	nodes(node, nodes) {
		let x = this;
		if (nodes) {
			x.cl(node);
			for (let node1 of nodes) {
				x.ap(node, node1);
			}
		} else {
			return Array.from(node.childNodes);
		}
	}
	elements(node) {
		let x = this;
		return x.nodes(node).filter(node => x.kind(node) === "element");
	}
	remove(node, node1) {
		let x = this;
		node.removeChild(node1);
	}
	del(node) {
		let x = this;
		node.parentNode?.removeChild(node);
	}
	cl(node) {
		let x = this;
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}
	ap(node, node1) {
		let x = this;
		node.appendChild(node1);
		return node1;
	}
	aps(node, nodes) {
		let x = this;
		for (let node1 of nodes) {
			x.ap(node, node1);
		}
	}
	insertBefore(node, node1, node2 = null) {
		node.insertBefore(node1, node2);
	}
	attr(...rest) {
		let x = this;
		if (rest.length < 3) {
			let [node, k] = rest;
			return node.getAttribute(k);
		} else {
			let [node, k, v] = rest;
			if (cutil.isNull(v)) {
				node.removeAttribute(k);
			}
			else {
				node.setAttribute(k, v);
			}
		}
	}
	attrx(...rest) {
		let x = this;
		if (rest.length < 4) {
			let [node, k, ns] = rest;
			let {name, prefix: pref, localName: nm, namespaceURI, value} = node.getAttributeNodeNS(ns, k);
			return {name, pref, nm, ns, value};
			return node.getAttributeNS(ns, k);
		} else {
			let [node, k, ns, v] = rest;
			if (cutil.isNull(v)) {
				node.removeAttributeNS(ns, k);
			} else {
				node.setAttributeNS(ns, k, v);
			}
		}
	}
	attrs(...rest) {
		let x = this;
		if (rest.length < 2) {
			let [node] = rest;
			return node.getAttributeNames().map(k => [k, node.getAttribute(k)]);
		} else {
			let [node, bis] = rest;
			for (let [k, v] of bis) {
				if (cutil.isNull(v)) {
					node.removeAttribute(k);
				} else {
					node.setAttribute(k, v);
				}
			}
		}
	}
	css(...rest) {
		let x = this;
		if (rest.length < 2) {
			let [node] = rest;
			return new Style({string: x.attr(node, "style")}).props;
		} else {
			let [node, props] = rest;
			if (cutil.isNull(props)) {
				x.attr(node, "style", null);
			} else {
				x.attr(node, "style", new Style({props: x.css(node)}).add(props));
			}
		}
	}
	ss(f) {
		let x = this;
		let ss = new Stylesheet();
		x.chain(ss, f);
		return ss;
	}
	js(f, arg) {
		let x = this;
		return new Script().add(f, arg);
	}
	kind(node) {
		let x = this;
		let {window} = x;
		let {Node} = window;
		return ({
			[Node.ELEMENT_NODE]: "element",
			[Node.ATTRIBUTE_NODE]: "attribute",
			[Node.TEXT_NODE]: "text",
			[Node.CDATA_SECTION_NODE]: "cdata",
			[Node.ENTITY_REFERENCE_NODE]: "entityReference",
			[Node.ENTITY_NODE]: "entity",
			[Node.PROCESSING_INSTRUCTION_NODE]: "processingInstruction",
			[Node.COMMENT_NODE]: "comment",
			[Node.DOCUMENT_NODE]: "document",
			[Node.DOCUMENT_TYPE_NODE]: "dtd",
			[Node.DOCUMENT_FRAGMENT_NODE]: "fragment",
			[Node.NOTATION_NODE]: "notation",
		})[node.nodeType];
		
	}
	toStr(node, b = false) {
		let x = this;
		let {window} = x;
		let {XMLSerializer} = window;
		let string = new XMLSerializer().serializeToString(node);
		if (b) {
			string = beautify.html(string, {
				preserve_newlines: false,
			});
		}
		return string;
	}
	fromStr(string, mime = "application/xml") {
		let x = this;
		let {window} = x;
		let {DOMParser} = window;
		return new DOMParser().parseFromString(string, mime);
	}
	fromStrH(string, mime = "text/html") {
		let x = this;
		let {window} = x;
		let {DOMParser} = window;
		return new DOMParser().parseFromString(string, mime);
	}
	fromStrNodes(string, mime) {
		let x = this;
		return Array.from(x.fromStr(string, mime).childNodes);
	}
	fromStrNode(string, mime) {
		let x = this;
		return x.fromStrNodes(string, mime)[0];
	}
	fromStrElement(string, mime) {
		let x = this;
		return x.fromStr(string, mime).documentElement;
	}
	root(document = this.document) {
		return document.documentElement;
	}
	q(node, selector) {
		return node.querySelector(selector);
	}
	qq(node, selector) {
		return Array.from(node.querySelectorAll(selector));
	}
	on(node, ev, cb, opt) {
		node.addEventListener(ev, cb, opt);
	}
	off(node, ev, cb, opt) {
		node.removeEventListener(ev, cb, opt);
	}
	escape(s) {
		let x = this;
		let node = x.dch("div");
		x.attr(node, "data-dummy", s);
		return /data-dummy="([^"]*)"/.exec(x.toStr(node))[1];
	}
	unescape(s) {
		let x = this;
		let node = x.dch("textarea");
		// s must be valid, escaped HTML text
		node.innerHTML = cutil.asString(s).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
		return node.value;
	}
	env() {
		let x = this;
		let {window, document} = x;
		return [
			"kind",
			"toStr",
			"fromStr",
			"fromStrH",
			"fromStrNodes",
			"fromStrNode",
			"fromStrElement",
			"root",
			"q",
			"qq",
			
			"chain",
			"win",
			"doc",
			"odoc",
			"pnode",
			"defns",
			"dc",
			"dcx",
			"dch",
			"dcg",
			"dcm",
			"dt",
			"dcdata",
			"dcomment",
			"c",
			"cx",
			"ch",
			"cg",
			"cm",
			"t",
			"cdata",
			"comment",
			"ns",
			"tag",
			"pref",
			"name",
			"nm",
			"toStrAll",
			"toText",
			"toTextAll",
			"clone",
			"cloneAll",
			"nodes",
			"elements",
			"remove",
			"del",
			"cl",
			"ap",
			"aps",
			"insertBefore",
			"attr",
			"attrx",
			"attrs",
			"css",
			"ss",
			"js",
			"on",
			"off",
			"escape",
			"unescape",
		].reduce((env, k) => (env[k] = x[k].bind(x), env), {x, window, document});
	}
	static env(...rest) {
		let X = this;
		let x = new X(...rest);
		return x.env();
	}
	static create({DOM, window, document, dfns}) {
		dfns ||= NS_HTML;
		return new X({DOM, window, document, dfns});
	}
}

// user class must also extend iwdom or iwjsdom
const iwx = cutil.extend({}/* , iwdom */, {
	_x: null,
	dfns: null,
	get x() {
		if (cutil.na(this._x)) {
			this._x = X.create(this);
		}
		return this._x;
	},
	set x(x) {
		this._x = x;
	},
});

export {X, Script, Style, Rule, RuleSet, Stylesheet, iwx, beautify};
