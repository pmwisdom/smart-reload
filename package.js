Package.describe({
  name: 'mirrorcell:smart-reload',
  version: '0.6.1',
  // Brief, one-line summary of the package.
  summary: 'Provides Options To Customize How Your App Automatically Updates Clients',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/pmwisdom/smart-reload',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});


Package.onUse(function(api) {
    api.versionsFrom('METEOR@0.9.2');

    api.use(['reactive-var', 'reload', 'templating', 'tracker', '3stack:idle-watcher@0.1.1', 'underscore']);
    api.imply(['reactive-var', 'reload', 'templating', 'tracker', '3stack:idle-watcher@0.1.1', 'underscore']);

    api.addFiles('lib/smart-reload.js', 'client');

    api.export('SmartReload', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('mirrorcell:smart-reload');
  api.addFiles('smart-reload-tests.js');
});
