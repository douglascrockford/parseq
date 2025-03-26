// demo.js
// 2025-03-26

// This is used by demo.html to demonstrate parseq.js. It includes a widget
// function that represents a service factory, a show callback that displays the
// final result, and a parseq routine written as an annotated nested array.

// This interacts with the browser using Plain Old DOM.

/*jslint
    browser
*/

/*property
    addEventListener, appendChild, backgroundColor, body, createElement,
    createTextNode, fallback, getElementById, location, onclick, parallel,
    race, reload, sequence, stringify, style, type, value
*/

import parseq from "./parseq.js";

let demo = document.getElementById("demo");
let arena = document.createElement("fieldset");
let legend = document.createElement("legend");
legend.append("Parseq Demo");
arena.append(legend);
demo.append(arena);
legend.onclick = function (ignore) {
    location.reload();
}

legend.onclick = function (ignore) {
    window.location.reload(true);
};

function prepare(name) {
    let fieldset = document.createElement("fieldset");
    let legend = document.createElement("legend");
    let land = document.createElement("div");
    legend.append(name);
    fieldset.append(legend);
    fieldset.append(land);
    arena.append(fieldset);

    function widget(name) {
        return function widget_requestor(callback, value) {
            let result = (
                value !== undefined
                ? value + ">" + name
                : name
            );
            let span = document.createElement("span");
            let success = document.createElement("tt");
            let failure = document.createElement("tt");
            span.append(name);
            success.append("\u00A0+\u00A0");
            success.className = "success";
            failure.append("\u00A0-\u00A0");
            failure.className = "failure";
            span.append(success);
            span.append(failure);
            success.addEventListener(
                "click",
                function success_handler() {
                    span.style.backgroundColor = "lightgreen";
                    return callback(result);
                },
                false
            );
            failure.addEventListener(
                "click",
                function failure_handler() {
                    span.style.backgroundColor = "pink";
                    return callback(undefined, result);
                },
                false
            );
            land.append(span);
            return function widget_cancel() {
                span.style.backgroundColor = "darkgray";
            };
        };
    }

    function show(value, reason) {
        let body;
        let color;
        let span = document.createElement("span");
        let result;
        let title;
        if (value !== undefined) {
            result = JSON.stringify(value);
            title = "+";
            color = "chartreuse";
            body = "palegreen";
        } else {
            result = JSON.stringify(reason);
            title = "-";
            color = "pink";
            body = "mistyrose";
        }
        span.append(title + " " + result);
        fieldset.style.backgroundColor = body;
        land.style.backgroundColor = body;
        span.style.backgroundColor = color;
        land.append(span);
    }

    let working_set = [widget("A"), widget("B"), widget("C"), widget("D")];
    legend.onclick = function (ignore) {
        land.innerHTML = "";
        parseq[name](working_set)(show);
    };

}

prepare("par_all");
prepare("par_any");
prepare("race");
prepare("fallback");
prepare("sequence");
