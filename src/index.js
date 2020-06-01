/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : js_pp.js
* Created at  : 2020-05-30
* Updated at  : 2020-06-01
* Author      : jeefo
* Purpose     :
* Description :
* Reference   :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
// ignore:start
"use strict";

/* globals*/
/* exported*/

// ignore:end

const parser       = require("@jeefo/ecma_parser/es8/parser");
const EventEmitter = require("@jeefo/utils/event_emitter");

const SPACES_REGEX = /\s+/g;

const sort_by_start_index = (a, b) => a.start - b.start;

class PreprocessEvent {
    constructor (node) {
        this.type   = node.id.replace(SPACES_REGEX, '_').toLowerCase();
        this.target = node;

        this._propagation_stopped           = false;
        this._immediate_propagation_stopped = false;
    }

    stopPropagation () {
        this._propagation_stopped = true;
    }

    stopImmediatePropagation () {
        this._propagation_stopped           = true;
        this._immediate_propagation_stopped = true;
    }
}

class JavascriptPreprocessor extends EventEmitter {
    emit (event_name, event) {
        if (this._events[event_name]) {
            const listeners = this._events[event_name].concat();
            for (const listener of listeners) {
                listener.call(this, event);
                if (event._immediate_propagation_stopped) {
                    return;
                }
            }
        }
    }

    walk (node) {
        const event = new PreprocessEvent(node);
        this.emit(event.type, event);

        if (event._propagation_stopped) {
            return;
        }

        switch (node.id) {
            case "Punctuator" :
            case "This keyword":
            case "Null literal":
            case "Meta property":
            case "Super property":
            case "String literal":
            case "Boolean literal":
            case "Numeric literal":
            case "Identifier name":
            case "Break statement":
            case "Empty statement":
            case "Undefined literal":
            case "Continue statement":
            case "Binding identifier":
            case "Debugger statement":
            case "Empty parameter list":
            case "Identifier reference":
            case "Template literal string":
            case "Regular expression literal":
                break;
            case "Comment" :
                if (node.previous_comment) {
                    this.walk(node.previous_comment);
                }
                break;
            case "Keyword" :
            case "Terminal symbol":
            case "Contextual keyword" :
                if (node.pre_comment) { this.walk(node.pre_comment); }
                break;
            case "If statement" :
            case "For statement" :
            case "While statement" :
                this.walk(node.expression);
                break;
            case "Try statement":
                this.walk(node.block);
                if (node.handler)   { this.walk(node.handler); }
                if (node.finalizer) { this.walk(node.finalizer); }
                break;
            case "Method body":
            case "Function body":
            case "Generator body":
            case "Block statement":
            case "Async method body":
            case "Async function body":
            case "Arrow function body":
            case "Async arrow function body":
                node.statement_list.map(n => this.walk(n));
                break;
            case "Async arrow binding identifier":
                this.walk(node.identifier);
                break;
            case "Arguments":
            case "Expression":
            case "Formal parameters":
            case "Arrow formal parameters":
                node.list.forEach(n => this.walk(n));
                break;
            case "Case block":
                node.case_clauses.forEach(n => this.walk(n));
                break;
            case "Class body":
            case "Array literal":
            case "Array binding pattern":
            case "Array assignment pattern":
                node.element_list.forEach(n => this.walk(n));
                break;
            case "Object literal":
                node.property_definition_list.forEach(n => this.walk(n));
                break;
            case "Object binding pattern":
            case "Object assignment pattern":
                node.property_list.forEach(n => this.walk(n));
                break;
            case "Assignment element":
                this.walk(node.target);
                break;
            case "Destructuring assignment target":
                this.walk(node.expression);
                if (node.initializer) { this.walk(node.initializer); }
                break;
            case "Template literal":
                node.body.forEach(n => this.walk(n));
                break;
            case "Lexical declaration":
                this.walk(node.keyword);
                node.binding_list.forEach(n => this.walk(n));
                node.delimiters.forEach(n => this.walk(n));
                this.walk(node.terminator);
                break;
            case "Lexical binding":
            case "Variable declaration":
                this.walk(node.binding);
                if (node.initializer) { this.walk(node.initializer); }
                break;
            case "Single name binding":
                if (node.initializer) { this.walk(node.initializer); }
                break;
            case "Arrow function":
            case "Function expression":
            case "Function declaration":
            case "Generator expression":
            case "Async arrow function":
            case "Async function expression":
                this.walk(node.body);
                this.walk(node.parameters);
                break;
            case "Method" :
            case "Getter method":
            case "Generator method":
                this.walk(node.property_name);
                this.walk(node.parameters);
                this.walk(node.body);
                break;
            case "Setter method":
                this.walk(node.property_name);
                this.walk(node.parameter);
                this.walk(node.body);
                break;
            case "Async method":
                break;
            case "Function call expression":
                this.walk(node.callee);
                this.walk(node.arguments);
                break;
            case "Case clause":
                this.walk(node.expression);
                node.statements.forEach(n => this.walk(n));
                break;
            case "Default clause":
                node.statements.forEach(n => this.walk(n));
                break;
            case "Finally block":
                this.walk(node.block);
                break;
            case "Catch block":
                this.walk(node.parameter);
                this.walk(node.block);
                break;
            case "For declaration":
                this.walk(node.binding);
                break;
            case "For of header":
                this.walk(node.binding);
                this.walk(node.expression);
                break;
            case "Binding property element":
                this.walk(node.property_name);
                this.walk(node.element);
                break;
            case "Return statement" :
            case "For iterator condition" :
            case "For iterator initializer" :
                if (node.expression) { this.walk(node.expression); }
                break;
            case "Class tail" :
                if (node.heritage) { this.walk(node.heritage); }
                this.walk(node.body);
                break;
            case "Class expression" :
            case "Class declaration" :
                this.walk(node.tail);
                break;
            case "Member operator" :
                this.walk(node.object);
                break;
            case "Formal parameter" :
                this.walk(node.binding_element);
                break;
            case "Catch parameter":
            case "Property set parameter list":
                this.walk(node.parameter);
                break;
            case "Binding pattern" :
            case "Assignment pattern" :
                this.walk(node.pattern);
                break;
            case "Property definition" :
                this.walk(node.expression);
                break;
            case "Super call" :
                this.walk(node.arguments);
                break;
            case "Binding rest element" :
                this.walk(node.element);
                break;
            case "Function rest parameter" :
                this.walk(node.binding_rest_element);
                break;
            case "Binding element pattern" :
                this.walk(node.binding_pattern);
                if (node.initializer) { this.walk(node.initializer); }
                break;
            case "Computed member expression" :
                this.walk(node.object);
                this.walk(node.expression);
                break;
            case "Property assignment" :
                this.walk(node.property_name);
                this.walk(node.expression);
                break;
            case "In operator" :
            case "Equality operator" :
            case "Assignment operator" :
            case "Arithmetic operator" :
            case "Instanceof operator" :
            case "Logical or operator" :
            case "Bitwise or operator" :
            case "Logical and operator" :
            case "Bitwise and operator" :
            case "Bitwise xor operator" :
            case "Comparision operator" :
            case "Bitwise shift operator" :
            case "Multiplicative operator" :
                this.walk(node.left);
                this.walk(node.right);
                break;
            case "Conditional operator" :
                this.walk(node.condition);
                this.walk(node.truthy_expression);
                this.walk(node.falsy_expression);
                break;
            case "For iterator header" :
                this.walk(node.initializer);
                this.walk(node.condition);
                if (node.update) { this.walk(node.update); }
                break;
            case "Literal" :
            case "Initializer" :
            case "Concise body" :
            case "Static method" :
            case "Property name" :
            case "Spread element" :
            case "Class heritage" :
            case "New expression" :
            case "Call expression" :
            case "Delete operator" :
            case "Await exression" :
            case "Binding element" :
            case "Typeof operator" :
            case "Throw statement" :
            case "Yield expression" :
            case "Arrow parameters" :
            case "Binding property" :
            case "Method definition" :
            case "Member expression" :
            case "Primary expression" :
            case "Async concise body" :
            case "Assignment property" :
            case "Grouping expression" :
            case "Logical not operator" :
            case "Expression statement" :
            case "Assignment expression" :
            case "Computed property name" :
            case "Positive plus operator" :
            case "Negation minus operator" :
            case "Parenthesized expression" :
            case "Left hand side expression" :
            case "Prefix increment operator" :
            case "Prefix decrement operator" :
            case "Postfix decrement operator" :
            case "Postfix increment operator" :
            case "Template literal expression" :
                this.walk(node.expression);
                break;
            case "Switch statement" :
                this.walk(node.keyword);
                this.walk(node.expression);
                this.walk(node.case_block);
                break;
            default:
                throw new Error(`Unexpected node: '${ node.id }'`);
        }
    }

    async compile (module) {
        this.module = module;

        const nodes = parser.parse(module.content);
        nodes.forEach(n => this.walk(n));

        module.replacements.sort(sort_by_start_index);
        let i = module.replacements.length;
        while (i--) {
            let {replacement, start, end} = module.replacements[i];
            if (typeof replacement === "function") {
                replacement = await replacement();
            }
            module.content = [
                module.content.slice(0, start),
                replacement,
                module.content.slice(end),
            ].join('');
        }
    }
}

module.exports = JavascriptPreprocessor;
