# Parseq

THIS PROJECT IS OBSOLETE. IT HAS BEEN SUPERSEDED BY [PRONTO](https://www.crockford.com/pronto.html)</a>.

Better living thru eventuality!

Parseq provides a straightforward functional approach to the management of eventuality. Parseq embraces the paradigm of distributed message passing.

You should structure your application as a set of requestor functions that each performs or manages a unit of work. This is a good design pattern in general. The workflow is specified by assembling the requestors into sets that are passed to the parseq factories. The units of work are kept distinct from the mechanics of control flow, leading to better programs.

Parseq is in the Public Domain.

[parseq.js](https://github.com/douglascrockford/parseq/blob/master/parseq.js) is a module that exports a parseq object that contains five factory functions.

### Factory

A factory function is any function that returns a requestor function. Parseq provides these factory functions:

    parseq.fallback(
        requestor_array,
        time_limit
    )

    parseq.par_all(
        requestor_array,
        time_limit,
        throttle
    )

    parseq.par_any(
        requestor_array,
        time_limit,
        throttle
    )

    parseq.race(
        requestor_array,
        time_limit,
        throttle
    )

    parseq.sequence(
        requestor_array,
        time_limit
    )

Each of these factories takes an array of requestor functions.

Each of these factory functions returns a requestor function. A factory function may throw an exception if it finds problems in its parameters.

### Requestor

A requestor function is any function that takes a callback and a value.

    my_little_requestor(callback, value)

A requestor will do some work or send a message to another process or system. When the work is done, the requestor signals the result by passing a value to its callback. The callback could be called in a future turn, so the requestor does not need to block, nor should it ever block.

The `value` may be of any type, including objects, arrays, and `undefined`.

A requestor will pass its `value` parameter to any requestors that it starts. A sequence will pass the `value` parameter to its first requestor. It will then pass the result of the previous requestor to the next requestor.

A requestor should not throw an exception. It should communicate all failures through its callback.

### Callback

A callback function takes two arguments: `value` and `reason`.

    my_little_callback(value, reason)

If `value` is `undefined`, then failure is being signalled. `reason` may contain information explaining the failure. If `value` is not `undefined`, then success is being signalled and `value` contains the result.

### Cancel

A requestor function may return a cancel function. A cancel function takes a reason argument that might be propagated as the `reason` of some callback.

    my_little_cancel(reason)

A cancel function attempts to stop the operation of the requestor. If a program decides that it no longer needs the result of a requestor, it can call the cancel function that the requestor returned. This is not an undo operation. It is just a way of stopping unneeded work. It is not guaranteed to stop the work.

### Time Limit

All of the factories can take a `time_limit` expressed in milliseconds. The requestor that the factory returns will fail if it can not finish its work in the specified time. If `time_limit` is `0` or `undefined`, then there will be no time limit.

Three of the factories (`par_all`, `par+any`, and `race`) can take a `throttle` argument. Normally these factories want to start all of their requestors at once. Unfortunately, that can cause some incompetent systems to fail due to resource exhaustion or other limitations. The `throttle` puts an upper limit on the number of requestors that can be running at once. Please be aware that some of your requestors might not start running until others have finished. You need to factor that delay into your time limits.


## Fallback

    parseq.fallback(
        requestor_array,
        time_limit
    )

`parseq.fallback` returns a requestor function. When the requestor is called, it will call the first requestor in `requestor_array`. If that is ultimately successful, its value will be passed to the callback. But if that requestor fails, the next requestor will be called, and so on. If none of the requestors is successful, then the fallback fails. If any succeeds, then the fallback succeeds.

If `time_limit` is `0` or `undefined`, then there is no time limit. If `time_limit` is greater than `0`, then a time limit is imposed. The fallback requestor will fail if it can not finish in time.

The fallback requestor will return a cancel function that can be called when the result is no longer needed.

## Par_all

    parseq.par_all(
        requestor_array,
        time_limit,
        throttle
    )

`parseq.par_all` returns a requestor that processes the `requestor_array` requestors in parallel, producing an array of all of results. The value produced by the first element of the `requestor_array` provides the first element of the result. If any requestor fails, the pending requestors are cancelled and this operation fails.

If the `time_limit` argument is supplied, then a time limit is imposed. The result must be complete before the time expires.

If there is no time limit, then the `par_all` operation is finished when all of the requestors are successful or one has failed.

If `throttle` is not `undefined` or `0`, then there will be a limit on the number of requestors that will be active at a time.

## Par_any

    parseq.par_any(
        requestor_array,
        time_limit,
        throttle
    )

`parseq.par_any` returns a requestor that processes the `requestor_array` requestors in parallel, producing an array of all of results. The value produced by the first element of the `requestor_array` provides the first element of the result. If one or more requestors succeed, then this operation succeeds.

If the `time_limit` argument is supplied, then a time limit is imposed. If the time expires, the pending requestors are cancelled.

If there is no time limit, then the `par_any` operation is finished when all of the requestors are finished.

If `throttle` is not `undefined` or `0`, then there will be a limit on the number of requestors that will be active at a time.

## Race

    parseq.race(
        requestor_array,
        time_limit,
        throttle
    )

`parseq.race` returns a requestor that starts all of the requestors in `requestor_array` in par_all. Its result is the result of the first of those requestors to successfully finish. All of the other requestors will be cancelled. If all of those requestors fail, then the race fails.

If the `time_limit` argument is supplied, then if no requestor has been successful in the allotted time, then the race fails, and all pending requestors are cancelled.

If `throttle` is not `undefined` or `0`, then there will be a limit on the number of requestors that will be active at a time.

## Sequence

    parseq.sequence(
        requestor_array,
        time_limit
    )

`parseq.sequence` returns a requestor that processes each requestor in `requestor_array` one at a time. Each of those requestors will be passed the result of the previous requestor as its `value` argument. If all succeed, then the sequence succeeds, giving the result of the last of the requestors. If any fail, then the sequence fails.

If the optional `time_limit` argument is supplied, then if all of the requestors have not all completed in the allotted time, then the sequence fails and the pending requestor is cancelled.

## Demo

A demonstration of parseq is provided in three files:

- [demo.html](https://github.com/douglascrockford/parseq/blob/master/demo.html)
- [demo.css](https://github.com/douglascrockford/parseq/blob/master/demo.css)
- [demo.js](https://github.com/douglascrockford/parseq/blob/master/demo.js)
