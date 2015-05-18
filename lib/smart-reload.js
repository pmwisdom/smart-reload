var idleStates = ['Active', 'Idle', 'Inactive'];

var localStartupTypeLoc = 'l_mirrorcell:startupType';
var firstStartupLoc = 'l_mirrorcell:firstStart';

var myRetry = null;
var updateNow = false;

var onReloadTemplate = new ReactiveVar(true);
var haveBlacklistSelector = new ReactiveVar(false);

var hasRetry = new ReactiveVar(false);

var tag = '[SmartReload] ';

SmartReload = {
    _options: {
        reload : {
            firstStart : false,
            idle: false,
            selector: false,
            router: false
        },
        idleTracker: {
            detectorMs: 1000,
            idleThreshold: 10,
            inactiveThreshold: 20,
            disconnectInactive: false
        },
        splashScreen: false, // MOBILE ONLY
        splashScreenTimeout: 2000, // MOBILE ONLY
        splashWaitOnLayout: 'layout', // MOBILE ONLY
        debug: false
    },
    routes: {},
    selectors: {
        /*form: {
            enabled: true,
            selector: 'form'
        },
        inputs: {
            enabled: true,
            selector: 'input'
        },
        custom: {
            enabled: false,
            selector: '.custom-class'
        }*/
        //Examples
    },
    idleWatchTracker: null,
    configure: function(options) {
        if(!_.isObject(options)) throw new Meteor.Error(tag, 'Options Was Not An Object');

        if(!Router && options.reload.router) {
            options.reload.router = false;
            throw new Meteor.Error(tag, "You tried to enable route filtering but you don't have iron:router installed");
        }

        _.extend(this._options, options);
        IdleWatcher.configure(SmartReload._options.idleTracker);
    },
    //Utility
    getReloadTemplateStatus: function() {
        return onReloadTemplate.get();
    },
    getRetryStatus: function() {
        return hasRetry.get();
    },
    getBlacklistSelectorStatus: function() {
        return haveBlacklistSelector.get();
    },
    debug: function(msg) {
        SmartReload._options.debug && console.log(tag + msg);
    }
};


IdleWatcher.configure(SmartReload._options.idleTracker);

function hideSplashScreen() {
    if(Meteor.isCordova && navigator && navigator.splashscreen) {
        navigator.splashscreen.hide();
    }
}
function showSplashScreen() {
    if (Meteor.isCordova && navigator && navigator.splashscreen) {
        navigator.splashscreen.show();
    }
}

//Initiate a reload retry
function retry() {
    SmartReload.debug("Retrying  Now");
    updateNow = true;
    hasRetry.set(false); // Purely utility

    //Retry calls the Reload_.onMigrate method on resume
    Reload._onResume ? Reload._onResume(myRetry) : myRetry();

    myRetry = null
}

//Checks the current route against the routes blacklist, if
//the route is on the blacklist, it will disable updates until another template change
//Returns true or false
function isOnReloadTemplate() {
    //Get Current Route Name or Null
    var route = Router.current()  && Router.current().route && Router.current().route.getName();
    if(!route) return; // if null, return

    SmartReload.debug("Checking for reload template " +  route + " " + !_.has(SmartReload.routes, route));
    onReloadTemplate.set(!_.has(SmartReload.routes, route)); //Set the reactive var to true / false based on blacklist

    console.log("IDLE WATCH?", !SmartReload.idleWatchTracker);
    //If we have a retry saved, go ahead and intiate the reload
    //Should call the inactive tracker if its enabled
    //Dont update if we have a idlewatchtracker (means were waiting for the user to go idle
    if(myRetry && onReloadTemplate.get()) {
        if(SmartReload._options.reload.idle && IdleWatcher.isActive()) {
            startIdleTracker();
            return;
        } else {
            retry(myRetry);
        }
    }
}

function hasBlacklistSelector() {
    var res = false;
    SmartReload.debug("Checking blacklisted selectors");
    _.each(SmartReload.selectors, function(obj) {
        if(obj.enabled) {
            var exists = document.querySelector(obj.selector);
            if(exists) {
                res = true;
            }
        }
    });

    haveBlacklistSelector.set(res);

    //Should call the inactive tracker if its enabled
    if(myRetry && !res) {
        if(SmartReload._options.reload.idle && IdleWatcher.isActive()) {
            startIdleTracker();
            return;
        } else {
            retry(myRetry);
        }
    }
}

//Runs a retry if it is pending and exists
function checkForPendingReload() {
    SmartReload.debug("Pending Reload? " + hasRetry.get());
    myRetry && retry(myRetry);

}

function reload() {
    if(SmartReload._options.splashScreen) {
        showSplashScreen();
    }
    localStorage.setItem(localStartupTypeLoc, 'reload');
    SmartReload.debug("Reloading, Please Wait");
    return [true, {}];
}

//Register SmartReload with the onMigrate method and register the callback
Reload._onMigrate('smartReload', onMigrate);

function onMigrate(retry) {
    SmartReload.debug("Migration Check...");

    //If we just came from the retry method, we want to update,
    //so go ahead and immediately do the update.
    if(updateNow) {
        updateNow = false;
        return reload()
    }

    var firstStart = localStorage.getItem(firstStartupLoc);

    //Check to see if its the applications first start up, if it is,
    //reload immediately to get a fresh start
    if(SmartReload._options.reload.firstStart && !firstStart) {
        SmartReload.debug("First Start Of App, Refresh Immediately");

        localStorage.setItem(firstStartupLoc, 'done');
        return reload();

    } else {
        SmartReload.debug("Not First Start, Check Router, then selectors, and then start the idle tracker");

        //Router blacklist -- if enabled and on a blacklisted page, will wait until Template refresh
        if(SmartReload._options.reload.router && !onReloadTemplate.get()) {
            SmartReload.debug("Excluded Reload Template, Wait On Template Refresh To Reload");

            myRetry = retry;
            hasRetry.set(true);

            return [false];
        }

        //Selector Blacklist -- if enabled and on a page with blacklisted selectors, will wait until Template refresh
        if(SmartReload._options.reload.selector && haveBlacklistSelector.get()){
            SmartReload.debug("Excluded Selector Is On Current Template, Wait on Template Refresh To Reload");

            myRetry = retry;
            hasRetry.set(true);

            return [false];
        }

        //If Idle Tracking is enabled, check if user is idle before updating
        if(SmartReload._options.reload.idle) {
            SmartReload.debug("Idle Option Enabled, waiting for user to be idle before updating");
            //If User is Active, go ahead and defer the reload till they become idle
            //or if they are not active, go ahead and reload immediately
            if(IdleWatcher.isActive()) {
                startIdleTracker();
                myRetry = retry;
                hasRetry.set(true);
                return [false];
            }
        }

        //Reload immediately if no other cases ring true
        return reload();


    }
}


//Utils
//Track Any Kind Of Template Render
Meteor.startup(function(){
    var startupType = localStorage.getItem(localStartupTypeLoc);

    //Starting Up From A  Reload
    if(startupType && startupType === 'reload') {
        //Do something before we reset the startupType
        localStorage.setItem(localStartupTypeLoc, 'startup');
    } else {
        localStorage.setItem(localStartupTypeLoc, 'startup');
    }

    for(var property in Template){
        // check if the property is actually a blaze template
        if(Blaze.isTemplate(Template[property])){
            var template=Template[property];
            // assign the template an onRendered callback who simply prints the view name
            template.onCreated(function(){
                SmartReload._options.reload.router && isOnReloadTemplate();
            });
            template.onRendered(function() {
                SmartReload._options.reload.selector && hasBlacklistSelector();
            });
        }
    }
    if(SmartReload._options.splashScreen && Meteor.isCordova && Blaze.isTemplate(Template[SmartReload._options.splashWaitOnLayout])) {
        Template[SmartReload._options.splashWaitOnLayout].onCreated(function () {
            if (SmartReload._options.splashScreen && Meteor.isCordova) {
                showSplashScreen()
            }
        });
        Template[SmartReload._options.splashWaitOnLayout].onRendered(function () {
            if (SmartReload._options.splashScreen && Meteor.isCordova) {
                Meteor.setTimeout(function () {
                    hideSplashScreen()
                }, SmartReload._options.splashScreenTimeout);
            }
        });
    }
});

function startIdleTracker() {
    //We already have a tracker, no need to make another
    if(SmartReload.idleWatchTracker) return;

    //Idle Tracker
    SmartReload.idleWatchTracker = Tracker.autorun(function () {
        var status = IdleWatcher.getStatus();

        //Status 1 OR 2 means we are not active, lets try and retry and reload
        SmartReload.debug("Idle Status Changed " + idleStates[status]);
        if(status === 1 || status === 2 && onReloadTemplate.get() && !haveBlacklistSelector.get()) {
            //Check To See if we still have a pending retry
            checkForPendingReload();
            //Stop This Tracker
            SmartReload.idleWatchTracker && SmartReload.idleWatchTracker.stop();
        }
    });
}
