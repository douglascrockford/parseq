# Parseq

Better living through asynchronicity!

Parseq provides a straight-forward, functional approach to the management of asynchronicity. Parseq embraces the paradigm of distributed message passing.

You should structure your application as a set of requestor functions that each perform or manage a unit of work. This is a good design pattern in general. The temporal relationships between the requestors is specified by assembling the requestors into sets that are passed to the parseq factories. The units of work are kept distinct from the mechanics of control flow.

parseq.js is a module that exports a parseq object that contains five factory functions. You can find all of them in the next section.

## Factory functions

- `fallback(requestor_array, milliseconds)`

- `parallel(required_array, optional_array, milliseconds, option, throttle)`

- `parallel_object(required_object, optional_object, milliseconds, option, throttle)`

- `race(requestor_array, milliseconds, throttle)`

- `sequence(requestor_array, milliseconds)`

Each of these factory functions returns a requestor function. A factory function may throw an exception if it finds problems in its parameters.

> A requestor function is any function that takes a callback and a value.

### Example of a requestor function

`my_little_requestor(callback, value)`

A requestor will do some work or send a message to another process or system.
When the work is done, the requestor signals the result by passing a value.
The callback could be called in a future turn, so the requestor does not need to block, nor should it ever block.

The `value` may be of any type, including objects, arrays, and `undefined`.

A requestor will pass its `value` parameter to any requestors that it starts.
A sequence will pass the `value` parameter to its first requestor. It will then pass the result of the previous requestor to the next requestor.

A requestor should not throw an exception. It should communicate all failures through its callback.

A callback function takes two arguments: `value` and `reason`.

### Example of a callback function

`my_little_callback(value, reason)`

If `value` is `undefined`, then failure is being signalled. `reason` may contain information explaining the failure. If `value` is not `undefined`, then success is being signalled and `value` contains the result.

A requestor function may return a cancel function. A cancel function takes a reason argument that might be propagated as the `reason` of some callback.

### Example of a cancel function

`my_little_cancel(reason)`

The cancel function attempts to stop the operation of the requestor. If a program decides that it no longer needs the result of a requestor, it can call the cancel function that the requestor returned. This is not an undo operation. It is just a way of stopping unneeded work. It is not guaranteed to stop the work.

All of these factories (except for `parallel_object`) take an array of requestor functions. The parallel factory can take two arrays of requestor functions.

All of the factories can take a time limit expressed in milliseconds. The requestor that the factory returns will fail if it can not finish its work in the specified time. If `milliseconds` is `0` or `undefined`, then there will be no time limit.

Three of the factories (`parallel`, `parallel_object`, and `race`) can take a `throttle` argument. Normally these factories want to start all of their requestors at once. Unfortunately, that can cause some incompetent systems to fail due to resource exhaustion or other limitations. The `throttle` puts an upper limit on the number of requestors that can be running at once. Please be aware that some of your requestors might not start running until others have finished. You need to factor that delay into your time limits.


## Factories' details

- `parseq.fallback(requestor_array, milliseconds)`

`parseq.fallback` returns a requestor function. When the requestor is called, it will call the first requestor in `requestor_array`. If that is ultimately successful, its value will be passed to the callback. But if the requestor fails, the next requestor will be called, and so on. If none of the requestors is successful, then the fallback fails. If any succeeds, then the fallback succeeds.

If `milliseconds` is `0` or `undefined`, then there is no time limit. If `milliseconds` is greater than zero, then that imposes a time limit. The fallback requestor will fail if it can not finish in time.

The fallback requestor will return a cancel function that can be called when the result is no longer needed.


- `parseq.parallel(required_array, optional_array, milliseconds, option, throttle)`

`parseq.parallel` returns a requestor that processes many requestors in parallel, producing an array of all of the successful results. It does not add parallelism to JavaScript. It makes it possible for JavaScript to exploit the natural parallelism of the universe.

`parseq.parallel` can take two arrays of requestors: Those that are required to produce results, and those that may optionally produce results. The parallel operation only succeeds if all of the required requestors succeed. Failure of optional requestors does not cause the parallel operation to fail.

The result maps the success values of the required requestors and optional requestors into a single array. The value produced by the first element of the requestors array provides the first element of the result.

If the `milliseconds` argument is supplied, then a time limit is imposed. The result must be complete before the time expires.

If there is no time limit, and if there are required requestors, then the parallel operation is finished when all of the required requestors are done. All unfinished optional requestors will be cancelled.

The option parameter works when there are both required and optionals. It can have one of three values:

`undefined // The optionals must finish before the required finish. The required must finish before the time limit, if there is one.`

`true // The required and the optionals must all finish before the time limit.`

`false // The required have no time limit. The optionals must finish before the required finish and the time limit, whichever is later.`

> If `throttle` is not `undefined` or `0`, then there will be a limit on the number of requestors that will be active at a time.


- `parseq.parallel_object(required_object, optional_object, milliseconds, option, throttle)`

`parseq.parallel_object` is like `parseq.parallel` except that it operates on objects of requestors instead of on arrays of requestors. If successful, it will deliver an object of results. A key from an object of requestors will be used as the key for the requestor's result.


- `parseq.race(requestor_array, milliseconds, throttle)`

`parseq.race` returns a requestor that starts all of the functions in the requestors array in parallel. Its result is the result of the first of those requestors to successfully finish. All of the other requestors will be cancelled. If all of those requestors fail, then the race fails.

If the `milliseconds` argument is supplied, then if no requestor has been successful in the allotted time, then the race fails, and all pending requestors are cancelled.

If `throttle` is not `undefined` or zero, then there will be a limit on the number of requestors that will be active at a time.


- `parseq.sequence(requestor_array, milliseconds)`

`parseq.sequence` returns a requestor that processes each element of the requestors array one at a time. Each requestor will be passed the result of the previous requestor as its `value` argument. If all succeed, then the sequence succeeds, giving the result of the last of the requestors. If any fail, then the sequence fails.

If the optional `milliseconds` argument is supplied, then if all of the requestors have not all completed in the allotted time, then the sequence fails and the pending requestor is cancelled.

## Demo

A demonstration of parseq is provided in three files:

- [demo.html](https://github.com/douglascrockford/parseq/blob/master/demo.html)
- [demo.css](https://github.com/douglascrockford/parseq/blob/master/demo.css)
- [demo.js](https://github.com/douglascrockford/parseq/blob/master/demo.js)

___
Douglas Crockford<br>
2018-05-09<br>
Public Domain
