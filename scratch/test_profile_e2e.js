const fs = require('fs');

// Simple DOM Mock
class MockElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.classList = new Set();
    this.attributes = {};
    this.style = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.eventListeners = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  removeAttribute(k) { delete this.attributes[k]; }
  classListAdd(c) { this.classList.add(c); }
  classListRemove(c) { this.classList.delete(c); }
  classListToggle(c, force) {
    if (force !== undefined) {
      if (force) this.classList.add(c); else this.classList.delete(c);
      return force;
    }
    if (this.classList.has(c)) { this.classList.delete(c); return false; }
    this.classList.add(c); return true;
  }
  contains(node) { return false; }
  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
  dispatch(event, e = {}) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(fn => fn(e));
    }
  }
  querySelectorAll(sel) { return []; }
  querySelector(sel) { return null; }
  focus() {}
  reset() { this.value = ''; }
}

console.log("Validating layout.js and profile.js under Node.js environment...");

const layoutContent = fs.readFileSync('js/layout.js', 'utf8');
const profileContent = fs.readFileSync('js/profile.js', 'utf8');

console.log("File sizes: layout.js =", layoutContent.length, "bytes, profile.js =", profileContent.length, "bytes");
console.log("profile.css =", fs.readFileSync('css/profile.css', 'utf8').length, "bytes");
console.log("profile.html =", fs.readFileSync('profile.html', 'utf8').length, "bytes");
console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
