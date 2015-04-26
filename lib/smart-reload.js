// Write your package code here!
var newVersionAvailable = new ReactiveVar(0);
var hasResume = new ReactiveVar(false);
var myRetry = null;
var updateNow = false;

var onReloadTemplate = new ReactiveVar(true);
var hasRetry = new ReactiveVar(false);

IdleWatcher.configure({
    detectorMs: 1000,
    idleThreshold: 10,
    inactiveThreshold: 20,
    disconnectInactive: false
});


var tag = '[SmartReload] ';

SmartReload = {
    _options: {
        reload : {
            firstStart : false,
            idle: false,
            selector: false,
            router: false
        }
    },
    routes: {},
    idleWatchTracker: null,
    configure: function(options) {
        if(!_.isObject(options)) throw new Meteor.Error(tag, 'Options Was Not An Object');
        _.extend(this._options, options);
    },
    getReloadTemplateStatus: function() {
        return onReloadTemplate.get();
    },
    getRetryStatus: function() {
        return hasRetry.get();
    }
};


function retry(thisRetry) {
    console.log("Retrying  Now");
    updateNow = true;
    Reload._onResume ? Reload._onResume(thisRetry) : thisRetry();
    hasRetry.set(false);
    myRetry = null
}

function isOnReloadTemplate() {
    var route = Router.current() && Router.current().route.getName();
    if(!route) return;

    console.log("Checking for reload template", route, !_.has(SmartReload.routes, route));
    onReloadTemplate.set(!_.has(SmartReload.routes, route));

    if(myRetry && onReloadTemplate.get()) {
        retry(myRetry);
    }
}

function checkForPendingReload() {
    console.log("Pending Reload?", myRetry);
    myRetry && retry(myRetry);

}

Reload._onMigrate('smartReload', onMigrate);

function onMigrate(retry) {
    console.log("Migration Check...");

    if(updateNow) {
        updateNow = false;
        return Reload._onResume ? Reload._onResume() : [true, {}];
    }

    newVersionAvailable.set(newVersionAvailable.get()+1);

    var firstStart = localStorage.getItem('l_mirrorcell:firstStart');
    //This means the app is completely fresh, we want to reload immediately
    if(SmartReload._options.reload.firstStart && !firstStart) {
        console.log(tag, "First Start Of App, Refresh Immediately");

        localStorage.setItem('l_mirrorcell:firstStart', 'done');
        return Reload._onResume ? Reload._onResume() : [true, {}];

    } else {
        console.log(tag, "Not First Start, lets start the idle tracker");

        //if router method is excluded
        if(SmartReload._options.reload.router && !onReloadTemplate.get()) {
            console.log(tag, "Looks like were on an excluded template, dont restart right now");
            myRetry = retry;
            hasRetry.set(true);
            return [false];
        }

        /*if(SmartReload._options.reload.selector){

         }*/

        if(SmartReload._options.reload.idle) {
            console.log(tag, "Idle Option Enabled, waiting for user to be idle before updating");
            if(IdleWatcher.isActive()) {
                startIdleTracker();
                myRetry = retry;
                hasRetry.set(true);
                return [false];
            } else {
                return Reload._onResume ? Reload._onResume() : [true, {}];
            }
        }


        return Reload._onResume ? Reload._onResume() : [true, {}];


    }
}

//Track Any Kind Of Template Render
Meteor.startup(function(){
    for(var property in Template){
        // check if the property is actually a blaze template
        if(Blaze.isTemplate(Template[property])){
            var template=Template[property];
            // assign the template an onRendered callback who simply prints the view name
            template.onCreated(function(){
                isOnReloadTemplate();
            });
        }
    }
});

function startIdleTracker() {
    //We already have a tracker, no need to make another
    if(SmartReload.idleWatchTracker) return;

    //Idle Tracker
    SmartReload.idleWatchTracker = Tracker.autorun(function () {
        var status = IdleWatcher.getStatus();

        //Status 1 OR 2 means we are not active, lets try and retry and reload
        console.log("Idle Status Changed", status);
        if(status === 1 || status === 2) {
            //Check To See if we still have a pending retry
            checkForPendingReload();
            //Stop This Tracker
            SmartReload.idleWatchTracker && SmartReload.idleWatchTracker.stop();
        }
    });
}

/*
Reload.hasResumed = function () {
    return hasResumed.get();
};

Reload.isWaitingForResume = function () {
    return newVersionAvailable.get();
};*/