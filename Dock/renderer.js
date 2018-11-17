var ffi = require('ffi')

var libfactorial = ffi.Library('./libfactorial', {
  'factorial': [ 'uint64', [ 'int' ] ]
})

var output = libfactorial.factorial(parseInt(35))

console.log('Your output: ' + output)