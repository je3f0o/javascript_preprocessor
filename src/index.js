/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2020-05-30
* Updated at  : 2020-10-07
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
const AsyncEventEmitter = require("@jeefo/utils/async/event_emitter");

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

class JavascriptPreprocessor extends AsyncEventEmitter {
    async emit (event_name, event) {
        if (this._events[event_name]) {
            const listeners = this._events[event_name].concat();
            for (const listener of listeners) {
                await listener.call(this, event);
                if (event._immediate_propagation_stopped) return;
            }
        }
    }

    async walk (node) {
        const event = new PreprocessEvent(node);
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
                await this.walk(node.pattern);
                break;
            case "Formal parameter" :
                await this.walk(node.binding_element);
                break;
            case "Binding rest element" :
                await this.walk(node.element);
                break;
            case "Assignment rest element" :
                await this.walk(node.target);
                break;
            case "Function rest parameter" :
                await this.walk(node.binding_rest_element);
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
                await this.walk(node.expression);
                break;

            case "Arrow function" :
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;

            case "Async arrow function" :
                await this.walk(node.keyword);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;

            case "Function call expression" :
                await this.walk(node.callee);
                await this.walk(node.arguments);
                break;
            case "Super call" :
                await this.walk(node.keyword);
                await this.walk(node.arguments);
                break;
            case "Super property" :
                await this.walk(node.keyword);
                await this.walk(node.property);
                break;
            case "Computed super property" :
                await this.walk(node.keyword);
                await this.walk(node.member);
                break;
            case "Member operator" :
                await this.walk(node.object);
                await this.walk(node.property);
                break;
            case "Computed member expression" :
                await this.walk(node.object);
                await this.walk(node.member);
                break;

            case "Single name binding" :
                await this.walk(node.binding_identifier);
                if (node.initializer) await this.walk(node.initializer);
                break;
            case "Binding element pattern" :
                await this.walk(node.binding_pattern);
                if (node.initializer) await this.walk(node.initializer);
                break;
            case "Assignment element" :
                await this.walk(node.target);
                if (node.initializer) await this.walk(node.initializer);
                break;

            case "Method definition" :
                await this.walk(node.method);
                break;
            case "Static method" :
                await this.walk(node.keyword);
                await this.walk(node.method);
                break;
            case "Method" :
                await this.walk(node.property_name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Async method"     :
            case "Getter method"    :
            case "Generator method" :
                await this.walk(node.keyword);
                await this.walk(node.property_name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Setter method" :
                await this.walk(node.keyword);
                await this.walk(node.property_name);
                await this.walk(node.parameter);
                await this.walk(node.body);
                break;

            case "Block statement"           :
            case "Method body"               :
            case "Function body"             :
            case "Generator body"            :
            case "Arrow function body"       :
            case "Async method body"         :
            case "Async function body"       :
            case "Async arrow function body" :
                for (const n of node.statement_list) await this.walk(n);
                break;

            case "Arguments" :
            case "Arrow formal parameters" :
                for (const n of node.list) await this.walk(n);
                break;
            case "Formal parameters" :
                for (const n of node.list) await this.walk(n);
                if (node.rest_parameter) await this.walk(node.rest_parameter);
                break;
            case "Grouping expression" :
                for (const n of node.expressions_list) await this.walk(n);
                break;

            case "Class body" :
            case "Array literal" :
            case "Array binding pattern" :
            case "Array assignment pattern" :
                for (const n of node.element_list) await this.walk(n);
                break;
            case "Object literal" :
                for (const n of node.property_definition_list) await this.walk(n);
                break;
            case "Template literal" :
                for (const n of node.body) await this.walk(n);
                break;
            case "Object binding pattern" :
            case "Object assignment pattern" :
                for (const n of node.property_list) await this.walk(n);
                break;
            case "Case block" :
                for (const n of node.clauses) await this.walk(n);
                break;

            case "Variable statement" :
            case "For variable declaration" :
                await this.walk(node.keyword);
                for (const n of node.declaration_list) await this.walk(n);
                break;
            case "Lexical declaration" :
                await this.walk(node.keyword);
                for (const n of node.binding_list) await this.walk(n);
                break;
            case "Lexical binding" :
            case "Variable declaration" :
                await this.walk(node.binding);
                if (node.initializer) await this.walk(node.initializer);
                break;

            case "New operator with arguments" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                await this.walk(node.arguments);
                break;

            case "With statement" :
            case "While statement" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                await this.walk(node.statement);
                break;
            case "If statement" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                await this.walk(node.statement);
                if (node.else_statement) await this.walk(node.else_statement);
                break;
            case "Else statement"                 :
                await this.walk(node.keyword);
                await this.walk(node.statement);
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
                await this.walk(node.left);
                await this.walk(node.operator);
                await this.walk(node.right);
                break;
            case "Expression" :
                await this.walk(node.left);
                await this.walk(node.right);
                break;

            case "Return statement" :
                await this.walk(node.keyword);
                if (node.expression) await this.walk(node.expression);
                break;
            case "Void operator"                  :
            case "Typeof operator"                :
            case "Delete operator"                :
            case "Class heritage"                 :
            case "Throw statement"                :
            case "Yield expression"               :
            case "Await expression"               :
            case "New operator without arguments" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                break;

            case "For in statement" :
            case "For of statement" :
                await this.walk(node.keyword);
                await this.walk(node.left);
                await this.walk(node.operator);
                await this.walk(node.right);
                await this.walk(node.statement);
                break;
            case "For statement" :
                await this.walk(node.keyword);
                if (node.initializer) await this.walk(node.initializer);
                if (node.condition) await this.walk(node.condition);
                if (node.update) await this.walk(node.update);
                await this.walk(node.statement);
                break;

            case "Property assignment" :
                await this.walk(node.property_name);
                await this.walk(node.expression);
                break;
            case "Binding property element"    :
            case "Assignment property element" :
                await this.walk(node.property_name);
                await this.walk(node.element);
                break;

            case "Labelled statement" :
                await this.walk(node.label);
                await this.walk(node.item);
                break;

            case "Switch statement" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                await this.walk(node.case_block);
                break;
            case "Case clause" :
                await this.walk(node.keyword);
                await this.walk(node.expression);
                for (const n of node.statements) await this.walk(n);
                break;
            case "Default clause" :
                await this.walk(node.keyword);
                for (const n of node.statements) await this.walk(n);
                break;

            case "Break statement" :
            case "Continue statement" :
                await this.walk(node.keyword);
                if (node.label) await this.walk(node.label);
                break;

            case "Try statement" :
                await this.walk(node.keyword);
                await this.walk(node.block);
                if (node.catch)   await this.walk(node.catch);
                if (node.finally) await this.walk(node.finally);
                break;
            case "Catch" :
                await this.walk(node.keyword);
                await this.walk(node.parameter);
                await this.walk(node.block);
                break;
            case "Catch parameter" :
                await this.walk(node.binding);
                break;
            case "Finally" :
                await this.walk(node.keyword);
                await this.walk(node.block);
                break;

            case "Function declaration" :
                await this.walk(node.keyword);
                await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Function expression" :
                await this.walk(node.keyword);
                if (node.name) await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Generator declaration" :
                await this.walk(node.keyword);
                await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Generator expression" :
                await this.walk(node.keyword);
                if (node.name) await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Async function declaration" :
                await this.walk(node.async_keyword);
                await this.walk(node.function_keyword);
                await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;
            case "Async function expression" :
                await this.walk(node.async_keyword);
                await this.walk(node.function_keyword);
                if (node.name) await this.walk(node.name);
                await this.walk(node.parameters);
                await this.walk(node.body);
                break;

            case "Conditional operator" :
                await this.walk(node.condition);
                await this.walk(node.truthy_expression);
                await this.walk(node.falsy_expression);
                break;

            case "Class declaration" :
                await this.walk(node.keyword);
                await this.walk(node.name);
                await this.walk(node.tail);
                break;
            case "Class expression" :
                await this.walk(node.keyword);
                if (node.name) await this.walk(node.name);
                await this.walk(node.tail);
                break;
            case "Class tail" :
                if (node.heritage) await this.walk(node.heritage);
                await this.walk(node.body);
                break;

            case "Property set parameter list" :
                await this.walk(node.parameter);
                break;

            case "Do while statement" :
                await this.walk(node.do_keyword);
                await this.walk(node.statement);
                await this.walk(node.while_keyword);
                await this.walk(node.expression);
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

    async compile (module) {
        this.module = module;

        const nodes = parser.parse(module.content);
        for (const n of nodes) await await this.walk(n);

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
