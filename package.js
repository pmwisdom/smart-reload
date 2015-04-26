Package.describe({
  name: 'mirrorcell:smart-reload',
  version: '0.5.0',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
    api.versionsFrom('1.1.0.2');

    api.use(['reactive-var', 'reload', 'tracker', '3stack:idle-watcher', 'underscore']);
    api.imply(['reactive-var', 'reload', 'tracker', '3stack:idle-watcher', 'underscore']);

    api.addFiles('lib/smart-reload.js', 'client');

    api.export('SmartReload', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('mirrorcell:smart-reload');
  api.addFiles('smart-reload-tests.js');
});
