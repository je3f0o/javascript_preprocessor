/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2020-05-30
* Updated at  : 2021-01-09
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

const parser            = require("@jeefo/ecma_parser/es8/parser");
const Readonly          = require("@jeefo/utils/object/readonly");
const AsyncEventEmitter = require("@jeefo/utils/async/event_emitter");

const SPACES_REGEX        = /\s+/g;
const sort_by_start_index = (a, b) => a.start - b.start;

class PreprocessEvent {
    constructor (module, node) {
        this._propagation_stopped           = false;
        this._immediate_propagation_stopped = false;

        const type     = node.id.replace(SPACES_REGEX, '_').toLowerCase();
        const readonly = new Readonly(this);

        readonly.prop("type"   , type);
        readonly.prop("target" , node);
        readonly.prop("module" , module);
    }

    stopPropagation () {
        this._propagation_stopped = true;
    }

    stopImmediatePropagation () {
        this._immediate_propagation_stopped = true;
    }
}

class JavascriptPreprocessor extends AsyncEventEmitter {
    async emit (event_name, event) {
        if (this._events[event_name]) {
            const listeners = this._events[event_name].concat();
            for (const listener of listeners) {
                await listener.call(this, event);
                if (event._immediate_propagation_stopped) {
                    event._propagation_stopped = true;
                    return;
                }
            }
        }
    }

    async walk (module, node) {
        const event = new PreprocessEvent(module, node);
        await this.emit(event.type, event);

        if (event._propagation_stopped) return;

        switch (node.id) {
            // Identifiers
            case "Identifier" :
            case "Identifier name" :
            case "Label identifier" :
            case "Binding identifier" :
            case "Identifier reference" :
            case "Async arrow binding identifier" :

            // Literals
            case "String literal" :
            case "Null literal" :
            case "Boolean literal" :
            case "Numeric literal" :
            case "Regular expression literal" :
            case "Template literal string" :

            // Keyword
            case "Keyword" :
            case "This keyword" :

            // Others
            case "Comment" :
            case "Undefined" :
            case "Punctuator" :
            case "New target" :
            case "Debugger statement" :
            case "Empty statement" :
            case "Empty parameter list" :
                break;

            case "Binding pattern" :
            case "Assignment pattern" :
                await this.walk(module, node.pattern);
                break;
            case "Formal parameter" :
                await this.walk(module, node.binding_element);
                break;
            case "Binding rest element" :
                await this.walk(module, node.element);
                break;
            case "Assignment rest element" :
                await this.walk(module, node.target);
                break;
            case "Function rest parameter" :
                await this.walk(module, node.binding_rest_element);
                break;

            case "Initializer"              :
            case "Concise body"             :
            case "Async concise body"       :
            case "Binding element"          :
            case "Binding property"         :
            case "Spread element" :
            case "Arrow parameters"         :
            case "Property name"            :
            case "Property definition"      :

            // Unary expressions
            case "Logical not operator"       :
            case "Bitwise not operator"       :
            case "Positive plus operator"     :
            case "Negation minus operator"    :
            case "Prefix decrement operator"  :
            case "Prefix increment operator"  :
            case "Postfix decrement operator" :
            case "Postfix increment operator" :

            case "Expression statement"     :
            case "Assignment property" :
            case "Assignment expression"    :
            case "Computed member access"   :
            case "Parenthesized expression" :
            case "Template literal expression" :
                await this.walk(module, node.expression);
                break;

            case "Arrow function" :
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;

            case "Async arrow function" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;

            case "Function call expression" :
                await this.walk(module, node.callee);
                await this.walk(module, node.arguments);
                break;
            case "Super call" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.arguments);
                break;
            case "Super property" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.property);
                break;
            case "Computed super property" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.member);
                break;
            case "Member operator" :
                await this.walk(module, node.object);
                await this.walk(module, node.property);
                break;
            case "Computed member expression" :
                await this.walk(module, node.object);
                await this.walk(module, node.member);
                break;

            case "Single name binding" :
                await this.walk(module, node.binding_identifier);
                if (node.initializer) await this.walk(module, node.initializer);
                break;
            case "Binding element pattern" :
                await this.walk(module, node.binding_pattern);
                if (node.initializer) await this.walk(module, node.initializer);
                break;
            case "Assignment element" :
                await this.walk(module, node.target);
                if (node.initializer) await this.walk(module, node.initializer);
                break;

            case "Method definition" :
                await this.walk(module, node.method);
                break;
            case "Static method" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.method);
                break;
            case "Method" :
                await this.walk(module, node.property_name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Async method"     :
            case "Getter method"    :
            case "Generator method" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.property_name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Setter method" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.property_name);
                await this.walk(module, node.parameter);
                await this.walk(module, node.body);
                break;

            case "Block statement"           :
            case "Method body"               :
            case "Function body"             :
            case "Generator body"            :
            case "Arrow function body"       :
            case "Async method body"         :
            case "Async function body"       :
            case "Async arrow function body" :
                for (const n of node.statement_list) await this.walk(module, n);
                break;

            case "Arguments" :
            case "Arrow formal parameters" :
                for (const n of node.list) await this.walk(module, n);
                break;
            case "Formal parameters" :
                for (const n of node.list) await this.walk(module, n);
                if (node.rest_parameter) {
                    await this.walk(module, node.rest_parameter);
                }
                break;
            case "Grouping expression" :
                for (const n of node.expressions_list) {
                    await this.walk(module, n);
                }
                break;

            case "Class body" :
            case "Array literal" :
            case "Array binding pattern" :
            case "Array assignment pattern" :
                for (const n of node.element_list) await this.walk(module, n);
                break;
            case "Object literal" :
                for (const n of node.property_definition_list) {
                    await this.walk(module, n);
                }
                break;
            case "Template literal" :
                for (const n of node.body) await this.walk(module, n);
                break;
            case "Object binding pattern" :
            case "Object assignment pattern" :
                for (const n of node.property_list) await this.walk(module, n);
                break;
            case "Case block" :
                for (const n of node.clauses) await this.walk(module, n);
                break;

            case "Variable statement" :
            case "For variable declaration" :
                await this.walk(module, node.keyword);
                for (const n of node.declaration_list) {
                    await this.walk(module, n);
                }
                break;
            case "Lexical declaration" :
                await this.walk(module, node.keyword);
                for (const n of node.binding_list) await this.walk(module, n);
                break;
            case "Lexical binding" :
            case "Variable declaration" :
                await this.walk(module, node.binding);
                if (node.initializer) await this.walk(module, node.initializer);
                break;

            case "New operator with arguments" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                await this.walk(module, node.arguments);
                break;

            case "With statement" :
            case "While statement" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                await this.walk(module, node.statement);
                break;
            case "If statement" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                await this.walk(module, node.statement);
                if (node.else_statement) {
                    await this.walk(module, node.else_statement);
                }
                break;
            case "Else statement"                 :
                await this.walk(module, node.keyword);
                await this.walk(module, node.statement);
                break;

            case "Assignment operator" :
            case "Logical or operator" :
            case "Logical and operator" :
            case "Bitwise or operator" :
            case "Bitwise xor operator" :
            case "Bitwise and operator" :
            case "Equality operator" :
            case "Relational operator" :
            case "Bitwise shift operator" :
            case "Additive operator" :
            case "Multiplicative operator" :
            case "Exponentiation operator" :
            case "Relational in operator" :
            case "Relational instanceof operator" :
                await this.walk(module, node.left);
                await this.walk(module, node.operator);
                await this.walk(module, node.right);
                break;
            case "Expression" :
                await this.walk(module, node.left);
                await this.walk(module, node.right);
                break;

            case "Return statement" :
                await this.walk(module, node.keyword);
                if (node.expression) await this.walk(module, node.expression);
                break;
            case "Void operator"                  :
            case "Typeof operator"                :
            case "Delete operator"                :
            case "Class heritage"                 :
            case "Throw statement"                :
            case "Yield expression"               :
            case "Await expression"               :
            case "New operator without arguments" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                break;

            case "For in statement" :
            case "For of statement" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.left);
                await this.walk(module, node.operator);
                await this.walk(module, node.right);
                await this.walk(module, node.statement);
                break;
            case "For statement" :
                await this.walk(module, node.keyword);
                if (node.initializer) await this.walk(module, node.initializer);
                if (node.condition) await this.walk(module, node.condition);
                if (node.update) await this.walk(module, node.update);
                await this.walk(module, node.statement);
                break;

            case "Property assignment" :
                await this.walk(module, node.property_name);
                await this.walk(module, node.expression);
                break;
            case "Binding property element"    :
            case "Assignment property element" :
                await this.walk(module, node.property_name);
                await this.walk(module, node.element);
                break;

            case "Labelled statement" :
                await this.walk(module, node.label);
                await this.walk(module, node.item);
                break;

            case "Switch statement" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                await this.walk(module, node.case_block);
                break;
            case "Case clause" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.expression);
                for (const n of node.statements) await this.walk(module, n);
                break;
            case "Default clause" :
                await this.walk(module, node.keyword);
                for (const n of node.statements) await this.walk(module, n);
                break;

            case "Break statement" :
            case "Continue statement" :
                await this.walk(module, node.keyword);
                if (node.label) await this.walk(module, node.label);
                break;

            case "Try statement" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.block);
                if (node.catch)   await this.walk(module, node.catch);
                if (node.finally) await this.walk(module, node.finally);
                break;
            case "Catch" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.parameter);
                await this.walk(module, node.block);
                break;
            case "Catch parameter" :
                await this.walk(module, node.binding);
                break;
            case "Finally" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.block);
                break;

            case "Function declaration" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Function expression" :
                await this.walk(module, node.keyword);
                if (node.name) await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Generator declaration" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Generator expression" :
                await this.walk(module, node.keyword);
                if (node.name) await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Async function declaration" :
                await this.walk(module, node.async_keyword);
                await this.walk(module, node.function_keyword);
                await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;
            case "Async function expression" :
                await this.walk(module, node.async_keyword);
                await this.walk(module, node.function_keyword);
                if (node.name) await this.walk(module, node.name);
                await this.walk(module, node.parameters);
                await this.walk(module, node.body);
                break;

            case "Conditional operator" :
                await this.walk(module, node.condition);
                await this.walk(module, node.truthy_expression);
                await this.walk(module, node.falsy_expression);
                break;

            case "Class declaration" :
                await this.walk(module, node.keyword);
                await this.walk(module, node.name);
                await this.walk(module, node.tail);
                break;
            case "Class expression" :
                await this.walk(module, node.keyword);
                if (node.name) await this.walk(module, node.name);
                await this.walk(module, node.tail);
                break;
            case "Class tail" :
                if (node.heritage) await this.walk(module, node.heritage);
                await this.walk(module, node.body);
                break;

            case "Property set parameter list" :
                await this.walk(module, node.parameter);
                break;

            case "Do while statement" :
                await this.walk(module, node.do_keyword);
                await this.walk(module, node.statement);
                await this.walk(module, node.while_keyword);
                await this.walk(module, node.expression);
                break;

            case "Destructuring assignment target" :
            case "Assignment property identifier" :

            case "For declaration" :
            case "For binding" :
            case "Binding list" :
                parser.log(node);
                debugger
                break;
            default: throw new Error(`Undefined node: '${node.id}'`);
        }
    }

    // TODO: fix replacement's end index
    async compile (module) {
        const nodes = parser.parse(module.content);
        for (const n of nodes) await this.walk(module, n);

        const {replacements} = module;
        replacements.sort(sort_by_start_index);
        while (replacements.length) {
            const _replacement = replacements.pop();
            let {replacement, start, end} = _replacement;
            if (typeof replacement === "function") {
                replacement = await replacement();
            }
            module.content = [
                module.content.slice(0, start),
                replacement,
                module.content.slice(end + 1),
            ].join('');

            const delta = replacement.length - ((end+1) - start);
            for (const r of replacements) {
                if (r.end   > end) r.end   += delta;
                if (r.start > end) r.start += delta;
            }
        }
    }
}

module.exports = JavascriptPreprocessor;
