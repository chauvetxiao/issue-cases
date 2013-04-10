function initConfig(grunt, options, deepMerge) {
  var path = require('path');

  options = options || {};

  var style = require('grunt-cmd-transport').style;

  // grunt-cmd-transport, css to js
  options.css2jsParser = style.init(grunt).css2jsParser;

  // grunt-cmd-concat, js concat css
  options.css2js = style.css2js;

  var pkg = options.pkg || 'package.json';
  if (grunt.util._.isString(pkg)) {
    pkg = grunt.file.readJSON(pkg);
  }
  options.pkg = pkg;

  var data = distConfig(options, pkg);

  // import transport rules
  data.transport = transportConfig(options, pkg);
  data.clean = {spm: ['.build'], dist: ['dist']};

  // deepMerge should merge to target
  if (deepMerge) {
    grunt.util._.merge(data, grunt.config.data);
    grunt.config.data = data;
  } else {
    grunt.util._.defaults(grunt.config.data, data);
  }

  grunt.registerTask('newline', function() {
    grunt.file.recurse('dist', function(f) {
      var extname = path.extname(f);
      if (extname === '.js' || extname === '.css') {
        var text = grunt.file.read(f);
        if (!/\n$/.test(text)) {
          grunt.file.write(f, text + '\n');
        }
      }
    });
  });

  grunt.registerTask(
    'spm-build', [
      'clean:dist', // delete dist direcotry first

      // build css
      'transport:spm',  // src/* -> .build/src/*
      'concat:css',   // .build/src/*.css -> .build/dist/*.css
      'cssmin:css',   // .build/dist/*.css -> dist/*.css

      // build js (must be invoke after css build)
      'transport:css',  // .build/dist/*.css -> .build/src/*.css.js
      'concat:js',  // .build/src/* -> .build/dist/*.js
      'uglify:js',  // .build/dist/*.js -> dist/*.js

      // resource
      'copy:spm',
      'clean:spm',
      'newline'
  ]);
}

exports.initConfig = initConfig;

// transport everything:
//
// grunt.initConfig({
//   options: {
//     ...
//     pkg: pkg
//   },
//   files: [{
//     cwd: 'src',
//     src: '**/*',
//     filter: 'isFile',
//     dest: '.build/src
//   }]
// });
//
// transport concated css into js:
//
// grunt.initConfig({
//   options: {
//     ...
//     pkg: pkg,
//     parsers: {
//       '.css': [css2jsParser]
//     },
//     files: [{
//       cwd: '.build/dist',
//       src: '**/*.css',
//       filter: 'isFile',
//       dest: '.build/src'
//     }]
//   }
// })
function transportConfig(options, pkg) {
  options = options || {};
  pkg = pkg || {spm: {}};
  if (!pkg.spm) {
    pkg.spm = {};
  }
  options.source = options.source || pkg.spm.source;
  options.format = options.format || pkg.spm.format;
  var spmConfig = {
    options: {
      pkg: pkg,
      process: {
        data: {pkg: pkg}
      }
    },
    files: [{
      cwd: options.source || 'src',
      src: '**/*',
      filter: 'isFile',
      dest: '.build/src'
    }]
  };

  // transport concated css into js
  var cssConfig = {
    options: {
      pkg: pkg,
      parsers: {
        '.css': [options.css2jsParser]
      }
    },
    files: [{
      cwd: '.build/dist',
      src: '**/*.css',
      filter: 'isFile',
      dest: '.build/src'
    }]
  };
  ['paths', 'format', 'debug', 'uglify'].forEach(function(key) {
    if (options.hasOwnProperty(key)) {
      spmConfig.options[key] = options[key];
      cssConfig.options[key] = options[key];
    }
  });
  return {spm: spmConfig, css: cssConfig};
}
exports.transportConfig = transportConfig;


// concat every css
//
// grunt.initConfig({
//   options: {
//     ...
//     paths: []
//   },
//   files: [{
//     cwd: '.build/src',
//     src: '**/*.css',
//     expand: true,
//     dest: '.build/dist'
//   }]
// })
//

function distConfig(options, pkg) {
  if (!pkg.spm) {
    process.emit('log.warn', 'missing `spm` in package.json');
    process.emit('log.info', 'read the docs at http://docs.spmjs.org/en/package');
    process.exit(1);
  }
  var output = pkg.spm.output;

  var jsconcats = {};
  var jsmins = {}, cssmins = {};

  var copies = [];

  output.forEach(function(name) {
    if (name.indexOf('*') === -1) {
      if (/\.css$/.test(name)) {
        cssmins['dist/' + name] = ['.build/dist/' + name];

        // copy debug css
        name = name.replace(/\.css$/, '-debug.css');
        copies.push({
          cwd: '.build/dist',
          src: name,
          expand: true,
          dest: 'dist'
        });

      } else if (/\.js$/.test(name)) {
        // concat js
        jsconcats['.build/dist/' + name] = ['.build/src/' + name];

        jsmins['dist/' + name] = ['.build/dist/' + name];

        // create debugfile
        name = name.replace(/\.js$/, '-debug.js');
        jsconcats['dist/' + name] = ['.build/src/' + name];
      } else {
        copies.push({
          cwd: '.build/src',
          src: name,
          expand: true,
          dest: 'dist'
        });
      }
    } else {
      copies.push({
        cwd: '.build/src',
        src: name,
        expand: true,
        dest: 'dist'
      });
    }
  });
  return {
    concat: {
      // options should have css2js
      options: options,
      js: {files: jsconcats},
      css: {
        files: [{
          cwd: '.build/src/',
          src: '**/*.css',
          expand: true,
          dest: '.build/dist'
        }]
      }
    },
    cssmin: {
      options: {keepSpecialComments: 0},
      css: {files: cssmins}
    },
    uglify: {js: {files: jsmins}},
    copy: {spm: {files: copies}},
  };
}
exports.distConfig = distConfig;
