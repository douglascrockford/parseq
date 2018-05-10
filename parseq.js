// parseq.js

// Better living through asynchronicity!

/*jslint node */

/*property
    concat, create, evidence, fallback, forEach, freeze, isArray, isSafeInteger,
    keys, length, min, parallel, parallel_object, pop, push, race, sequence,
    some
*/

function make_reason(factory_name, excuse, evidence) {

// Make a reason object. These will be used for exceptions and cancellations.
// They are made from Error objects for throwability.

    const reason = new Error("parseq." + factory_name + (
        (excuse === undefined)
            ? ""
            : ": " + excuse
    ));
    reason.evidence = evidence;
    return reason;
}

function is_callback(callback) {

// A 'callback' function takes two arguments, 'value' and 'reason'.

    return typeof callback === "function" && callback.length === 2;
}

function check_callback(callback, factory_name) {
    if (!is_callback(callback)) {
        throw make_reason(factory_name, "Not a callback.", callback);
    }
}

function check_requestor_array(requestor_array, factory_name) {

// A requestor array contains only requestors. A requestor is a function
// that takes one or two arguments: 'callback' and optionally 'initial_value'.

    if (
        !Array.isArray(requestor_array)
        || requestor_array.length < 1
        || requestor_array.some(function (requestor) {
            return (
                typeof requestor !== "function"
                || requestor.length < 1
                || requestor.length > 2
            );
        })
    ) {
        throw make_reason(
            factory_name,
            "Bad requestors array.",
            requestor_array
        );
    }
}

function run(
    factory_name,
    requestor_array,
    initial_value,
    action,
    timeout,
    milliseconds,
    throttle = 0
) {

// The 'run' function does the work that is common to all of the parseq
// factories. It takes the name of the factory, an array of requestors, an
// initial value, an action callback, a timeout callback, a time limit in
// milliseconds, and a throttle.

// If all goes well we will be calling all of the requestor functions in the
// array. Each of them  might return a cancel function that will be kept in
// the 'cancel_array'.

    let cancel_array = new Array(requestor_array.length);
    let next_number = 0;
    let timer_id;

// We need 'cancel' and 'start_requestor' functions.

    function cancel(reason = make_reason(factory_name, "Cancel.")) {

// Stop all unfinished business. This can be called when a requestor fails.
// It can also be called when a requestor succeeds, such as 'race' stopping
// its losers, or 'parallel' stopping the unfinished optionals.

// If a timer is running, stop it.

        if (timer_id !== undefined) {
            clearTimeout(timer_id);
            timer_id = undefined;
        }

// If anything is still going, cancel it.

        if (cancel_array !== undefined) {
            cancel_array.forEach(function (cancel) {
                try {
                    if (typeof cancel === "function") {
                        return cancel(reason);
                    }
                } catch (ignore) {}
            });
            cancel_array = undefined;
        }
    }

    function start_requestor(value) {

// The 'start_requestor' function is not recursive, exactly. It does not
// directly call itself, but it does return a function that might call
// 'start_requestor'.

// Start the execution of a requestor, if there are any still waiting.

        if (
            cancel_array !== undefined
            && next_number < requestor_array.length
        ) {

// Each requestor has a number.

            let number = next_number;
            next_number += 1;

// Call the next requestor, passing in a callback function,
// saving the cancel function that the requestor might return.

            const requestor = requestor_array[number];
            try {
                cancel_array[number] = requestor(
                    function start_requestor_callback(value, reason) {

// This callback function is called by the 'requestor' when it is done.
// If we are no longer running, then this call will be ignored.
// For example, it might be a result that is sent back after the time
// limit has expired. This callback function can only be called once.

                        if (
                            cancel_array !== undefined
                            && number !== undefined
                        ) {

// We no longer need the cancel associated with this requestor.

                            cancel_array[number] = undefined;

// Call the 'action' function to let the requestor know what happened.

                            action(value, reason, number);

// Clear 'number' so this callback can not be used again.

                            number = undefined;

// If there are any requestors that are still waiting to start, then start the
// next one. If the next requestor is in a sequence, then it will get the most
// recent 'value'. The others get the 'initial_value'.

                            return start_requestor(
                                (factory_name === "sequence")
                                    ? value
                                    : initial_value
                            );
                        }
                    },
                    value
                );

// Requestors are required to report their failure through the callback.
// They are not allowed to throw exceptions. If we happen to catch one,
// it will be treated as a failure.

            } catch (exception) {
                action(undefined, exception, number);
                number = undefined;
                start_requestor(value);
            }
        }
    }

// With the 'cancel' and the 'start_requestor' functions in hand, we can now
// get to work.

// If a timeout was requested, start the timer.

    if (milliseconds !== undefined) {
        if (typeof milliseconds === "number" && milliseconds >= 0) {
            if (milliseconds > 0) {
                timer_id = setTimeout(timeout, milliseconds);
            }
        } else {
            throw make_reason(factory_name, "Bad milliseconds.", milliseconds);
        }
    }

// If we are doing 'race' or 'parallel', we want to start all of the requestors
// at once. However, if there is an effective 'throttle' in place then we can
// not start them all. We will start as many as 'throttle' allows, and then as
// each requestor finishes, another will be started.

// The 'sequence' and 'fallback' factories set 'throttle' to 1 because they
// process one at a time and will always start another requestor when the
// previous requestor finishes.

    if (!Number.isSafeInteger(throttle) || throttle < 0) {
        throw make_reason(factory_name, "Bad throttle.", throttle);
    }
    let repeat = Math.min(throttle || Infinity, requestor_array.length);
    while (repeat > 0) {
        setTimeout(start_requestor, 0, initial_value);
        repeat -= 1;
    }

// We return 'cancel' which will allow the requestor to cancel this work.

    return cancel;
}

// The factories: --------------------------------------------------------------

function parallel(
    required_array,
    optional_array,
    milliseconds,
    option,
    throttle,
    factory_name = "parallel"
) {

// The parallel factory is the most complex of these factories. It can take
// a second array of requestors that get a more forgiving failure policy.
// It returns a requestor that will produce an array of values.

    let number_of_required;
    let requestor_array;

// There are four cases because 'required_array' and 'optional_array' can both
// be empty.

    if (required_array === undefined || required_array.length === 0) {
        number_of_required = 0;
        if (optional_array === undefined || optional_array.length === 0) {

// If both are empty, then there is probably a mistake.

            throw make_reason(
                factory_name,
                "Missing requestor array.",
                required_array
            );
        }

// If there is only 'optional_array', then it is the 'requestor_array'.

        requestor_array = optional_array;
        option = true;
    } else {

// If there is only 'required_array', then it is the 'requestor_array'.

        number_of_required = required_array.length;
        if (optional_array === undefined || optional_array.length === 0) {
            requestor_array = required_array;
            option = undefined;

// If both arrays are provided, we concatenate them together.

        } else {
            requestor_array = required_array.concat(optional_array);
            if (option !== undefined && typeof option !== "boolean") {
                throw make_reason(factory_name, "Bad option.", option);
            }
        }
    }

// We check the array and return the requestor.

    check_requestor_array(requestor_array, factory_name);
    return function parallel_requestor(callback, initial_value) {
        check_callback(callback, factory_name);
        let number_of_pending = requestor_array.length;
        let number_of_pending_required = number_of_required;
        let results = [];

// 'run' gets it started.

        let cancel = run(
            factory_name,
            requestor_array,
            initial_value,
            function parallel_action(value, reason, number) {

// The action function gets the result of each requestor in the array.
// 'parallel' wants to return an array of all of the values it sees.

                results[number] = value;
                number_of_pending -= 1;

// If the requestor was one of the requireds, make sure it was successful.
// If it failed, then the parallel operation fails. If an optionals requestor
// fails, we can still continue.

                if (number < number_of_required) {
                    number_of_pending_required -= 1;
                    if (value === undefined) {
                        cancel(reason);
                        callback(undefined, reason);
                        callback = undefined;
                        return;
                    }
                }

// If all have been processed, or if the requireds have all succeeded and we
// do not have an 'option', then we are done.

                if (
                    number_of_pending < 1
                    || (
                        option === undefined
                        && number_of_pending_required < 1
                    )
                ) {
                    cancel(make_reason(factory_name, "Optional."));
                    callback(
                        (factory_name === "sequence")
                            ? results.pop()
                            : results
                    );
                    callback = undefined;
                }
            },
            function parallel_timeout() {

// When the timer fires, work stops unless we were under the 'false' option.
// The 'false' option puts no time limits on the requireds, allowing the
// optionals to run until the requireds finish or the the time expires,
// whichever happens last.

                const reason = make_reason(
                    factory_name,
                    "Timeout.",
                    milliseconds
                );
                if (option === false) {
                    option = undefined;
                    if (number_of_pending_required < 1) {
                        cancel(reason);
                        callback(results);
                    }
                } else {

// Time has expired. If all of the requireds were successful,
// then the parallel operation is successful.

                    cancel(reason);
                    if (number_of_pending_required < 1) {
                        callback(results);
                    } else {
                        callback(undefined, reason);
                    }
                    callback = undefined;
                }
            },
            milliseconds,
            throttle
        );
        return cancel;
    };
}

function race(requestor_array, milliseconds, throttle) {

// The race factory returns a requestor that starts all of the requestors in
// requestor_array at once. The first success wins.

    const factory_name = (throttle === 1)
        ? "fallback"
        : "race";

    check_requestor_array(requestor_array, factory_name);
    return function race_requestor(callback, initial_value) {
        check_callback(callback, factory_name);
        let number_of_pending = requestor_array.length;
        let cancel = run(
            factory_name,
            requestor_array,
            initial_value,
            function race_action(value, reason, number) {
                number_of_pending -= 1;

// We have a winner. Cancel the losers and pass the value to the callback.

                if (value !== undefined) {
                    cancel(make_reason(factory_name, "Loser.", number));
                    callback(value);
                    callback = undefined;
                }

// There was no winner. Signal a failure.

                if (number_of_pending < 1) {
                    cancel(reason);
                    callback(undefined, reason);
                    callback = undefined;
                }
            },
            function race_timeout() {
                let reason = make_reason(
                    factory_name,
                    "Timeout.",
                    milliseconds
                );
                cancel(reason);
                callback(undefined, reason);
                callback = undefined;
            },
            milliseconds,
            throttle
        );
        return cancel;
    };
}

const parseq = Object.create(null);
parseq.fallback = function fallback(requestor_array, milliseconds) {

// The fallback factory will return a requestor that will try each requestor in
// 'requestor_array', one at a time, until it finds a successful one. A fallback
// is just a throttled race.

    return race(requestor_array, milliseconds, 1);
};
parseq.parallel = parallel;
parseq.parallel_object = function parallel_object(
    required_object,
    optional_object,
    milliseconds,
    option,
    throttle
) {

// 'parallel_object' is similar to 'parallel' except that it takes and produces
// objects of requestors instead of arrays of requestors. This factory converts
// the objects to arrays, and the requestor it returns turns them back again.
// It lets 'parallel' do most of the work.

    const names = [];
    let required_array = [];
    let optional_array = [];

// Extract the names and requestors from 'required_object'.
// We only collect functions with an arity of 1 or 2.

    if (required_object) {
        if (typeof required_object !== "object") {
            throw make_reason(
                "parallel_object",
                "Type mismatch.",
                required_object
            );
        }
        Object.keys(required_object).forEach(function (name) {
            let requestor = required_object[name];
            if (
                typeof requestor === "function"
                && (requestor.length === 1 || requestor.length === 2)
            ) {
                names.push(name);
                required_array.push(requestor);
            }
        });
    }

// Extract the names and requestors from 'optional_object'.
// Look for duplicate keys.

    if (optional_object) {
        if (typeof optional_object !== "object") {
            throw make_reason(
                "parallel_object",
                "Type mismatch.",
                optional_object
            );
        }
        Object.keys(optional_object).forEach(function (name) {
            let requestor = optional_object[name];
            if (
                typeof requestor === "function"
                && (requestor.length === 1 || requestor.length === 2)
            ) {
                if (required_object && required_object[name] !== undefined) {
                    throw make_reason(
                        "parallel_object",
                        "Duplicate name.",
                        name
                    );
                }
                names.push(name);
                optional_array.push(requestor);
            }
        });
    }

// Make sure that we harvested something.

    if (names.length === 0) {
        return make_reason(
            "parallel_object",
            "No requestors.",
            required_object
        );
    }

// Call parallel to get a requestor.

    const parallel_requestor = parallel(
        required_array,
        optional_array,
        milliseconds,
        option,
        throttle,
        "parallel_object"
    );

// Return the parallel object requestor.

    return function parallel_object_requestor(callback, initial_value) {

// When our requestor is called, we return the result of our parallel requestor.

        return parallel_requestor(

// We pass our callback to the parallel requestor,
// converting its value into an object.

            function parallel_object_callback(value, reason) {
                if (value === undefined) {
                    return callback(undefined, reason);
                }
                const object = Object.create(null);
                names.forEach(function (name, index) {
                    object[name] = value[index];
                });
                return callback(object);
            },
            initial_value
        );
    };
};
parseq.race = race;
parseq.sequence = function sequence(requestor_array, milliseconds) {

// A sequence runs each requestor in order, passing results to the next,
// as long as they are all successful. A sequence is a throttled parallel.

    return parallel(
        requestor_array,
        undefined,
        milliseconds,
        undefined,
        1,
        "sequence"
    );

};
export default Object.freeze(parseq);
