/**
  * Copyright (c) 2012-2013 Ivo Wetzel.
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  * THE SOFTWARE.
  */
(function(exports) {

    /**
      * Creates an unbound version of a member function.
      *
      * In case of a static field the call will translate into:
      *
      *     field.apply(clas, arguments)
      *
      * Otherwise we create a super version which can be
      * passed an additional "this" arguments in front of
      * it's normal arguments via:
      *
      *     Function.call.apply(field, argumments)
      *
      * Which effectively results in:
      *
      *     field.call(this, arguments)
      */
    function bound(context, callee) {
        return function() {
            return callee.apply(context, arguments);
        };
    }

    function Class(ctor) {

        // Check whether the ctor function is in fact another class and not
        // just a plain function.
        var ctorIsClass = Class.is(ctor);

        // Setup the class constructor which can be called in two different ways:
        //
        // 1. new ClassConstructor(args...)
        //
        //     - This will create a new instance as usual
        //
        // 2. ClassConstructor(instance, args...)
        //
        //     - This will function as a call to the super constructor
        //
        // The trick here is to figure out in what context the below function is
        // invoked.
        function clas() {

            // If we have a ctor function or a base class with a ctor
            // we need to invoke it
            if (ctorIsClass || ctor instanceof Function) {

                // We check to see if this function was called as a constructor
                // or we're trying to call the ctor of another class
                var bound = this.constructor === Class || ctorIsClass;

                // If so, we need to setup the next call in a different way
                // If unbound the call takes an additional "this" arguments in
                // front of the others (`Function.call.apply(field, argumments)`)
                // otherwise we just invoke the constructor function normally
                (bound ? ctor : Function.call).apply(bound ? this : ctor, arguments);

            }

        }

        // Set up the prototype chain and the internal prototype object `$proto`
        // which is used to extend subclasses with the methods of this class
        // when they inherit.
        var prototype = clas.prototype,
            $internal = clas.$$ = {},
            $inherits = clas.$$$ = [clas, Class];

        // Now we set prototype constructor to Class,
        // this way we can identify function's as classes later on
        clas.constructor = prototype.constructor = Class;

        // Static and member function `is` can be used to to check for
        // inheritance on both the class object and any of its instances
        clas.is = prototype.is = function(o) {
            return $inherits.indexOf(o) !== -1;
        };

        // Now we can extend the clas constructor and it's prototype with all
        // objects and base classes passed to the factory
        var props, i = 0;
        while((props = arguments[i++])) {

            // Check if we extend with a class
            // If so, push the extending class' inheritance chain into ours.
            // Also, for classes we need to access the internal properties
            if (Class.is(props)) {
                $inherits.push.apply($inherits, props.$$$);
                props = props.$$;
            }

            // Now go over all potential methods and properties.
            for(var key in props) {

                // Skip if it's on the prototype
                if (props.hasOwnProperty(key)) {

                    // Add the to field the internal class prototype
                    var field = ($internal[key] = props[key]),
                        isFunction = field instanceof Function;

                    // In case of a static field strip the prefix and
                    // create unbound methods and static field.
                    // Also check to see if we're extending with the prototype
                    // of a function, if so, we do not want to convert statics
                    // because this would break legacy code
                    if (/^\$./.test(key)
                        && !(ctor && ctor.prototype === props)) {

                        key = key.substring(1);
                        clas[key] = isFunction ? bound(clas, field) : field;

                    // If it's not static add it to the prototype chain
                    } else {
                        prototype[key] = field;

                        // Create unbound versions of the methods
                        if (isFunction) {
                            clas[key] = bound(field, Function.call);
                        }

                    }

                }

            }

        }

        return clas;

    }

    // Check whether something is an instance, a class, an instance of a class
    // or a subclass of a class
    Class.is = function(inst, clas) {
        clas = clas !== undefined ? clas : Class;

        // A class is a class in case it's constructor is "Class"
        // and it's a instance of a function and that instance also inherits
        // from the given base class
        return (inst && clas) && inst.constructor === Class
                && inst.is instanceof Function && inst.is(clas);
    };

    exports.Class = Class;

})(typeof exports !== 'undefined' ? exports : this);


