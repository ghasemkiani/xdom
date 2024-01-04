import {cutil} from "@ghasemkiani/base";
import {Obj} from "@ghasemkiani/base";

class X extends Obj {
	static {
		cutil.extend(this, {
			NS_HTML: "http://www.w3.org/1999/xhtml",
			NS_SVG: "http://www.w3.org/2000/svg",
			NS_MATHML: "http://www.w3.org/1998/Math/MathML",
		});
		cutil.extend(this.prototype, {
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
	getWindow() {
		return cutil.global().window;
	}
	get window() {
		if(!this._window) {
			this._window = this.getWindow();
		}
		return this._window;
	}
	set window(window) {
		this._window = window;
		this.document = null;
	}
	get document() {
		if(cutil.na(this._document)) {
			this._document = this.window.document;
		}
		return this._document;
	}
	set document(document) {
		this._document = document;
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
	chain(node, f, ...rest) {
		let x = this;
		let result;
		if (typeof f === "function") {
			result = f(node, ...rest);
		}
		return result;
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
		return node;
	}
	dcc(tag, f) {
		let x = this;
		let {document} = x;
		return x.dcx(tag, x.root(document)?.namespaceURI || X.NS_HTML, f);
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
	dcomment(text, f) {
		let x = this;
		let {document} = x;
		let node = document.createComment(text);
		x.chain(node, f);
		return node;
	}
	ns(node) {
		return node.namespaceURI;
	}
	tag(node) {
		return node.tagName;
	}
	pref(node) {
		return node.prefix;
	}
	name(node) {
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
	cl(node) {
		let x = this;
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}
	ap(node, node1) {
		let x = this;
		node.appendChild(node1);
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
	attr(node, k, v) {
		
	}
	css(node, k, v) {
		
	}
	t(node, text) {
		
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
	toStr(node) {
		let x = this;
		let {window} = x;
		let {XMLSerializer} = window;
		return new XMLSerializer().serializeToString(node);
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
	fromStrElement(string, mime) {
		let x = this;
		return x.fromStr(string, mime).documentElement;
	}
	root(document = this.document) {
		return document.documentElement;
	}
	env() {
		let x = this;
		let {window, document} = x;
		return [
			"win",
			"doc",
			"defns",
			"ns",
			"tag",
			"pref",
			"name",
			"root",
			"kind",
			"toStr",
			"fromStr",
			"fromStrH",
			"dcx",
		].reduce((env, k) => (env[k] = x[k].bind(x), env), {x, window, document});
	}
	static env(...rest) {
		let X = this;
		let x = new X(...rest);
		return x.env();
	}
}

export {X};
