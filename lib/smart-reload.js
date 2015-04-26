
var myRetry = null;
var updateNow = false;

var onReloadTemplate = new ReactiveVar(true);
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
        }
    },
    routes: {},
    idleWatchTracker: null,
    configure: function(options) {
        if(!_.isObject(options)) throw new Meteor.Error(tag, 'Options Was Not An Object');
        _.extend(this._options, options);

        IdleWatcher.configure(SmartReload._options.idleTracker);
    },
    //Utility
    getReloadTemplateStatus: function() {
        return onReloadTemplate.get();
    },
    getRetryStatus: function() {
        return hasRetry.get();
    }
};


IdleWatcher.configure(SmartReload._options.idleTracker);


//Initiate a reload retry
function retry() {
    console.log("Retrying  Now");
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
    var route = Router.current() && Router.current().route.getName();
    if(!route) return; // if null, return

    console.log("Checking for reload template", route, !_.has(SmartReload.routes, route));
    onReloadTemplate.set(!_.has(SmartReload.routes, route)); //Set the reactive var to true / false based on blacklist

    //If we have a retry saved, go ahead and intiate the reload
    if(myRetry && onReloadTemplate.get()) {
        retry(myRetry);
    }
}

//Runs a retry if it is pending and exists
function checkForPendingReload() {
    console.log("Pending Reload?", myRetry);
    myRetry && retry(myRetry);

}

function reload() {
    return Reload._onResume ? Reload._onResume() : [true, {}];
}

//Register SmartReload with the onMigrate method and register the callback
Reload._onMigrate('smartReload', onMigrate);

function onMigrate(retry) {
    console.log("Migration Check...");

    //If we just came from the retry method, we want to update,
    //so go ahead and immediately do the update.
    if(updateNow) {
        updateNow = false;
        return reload()
    }

    var firstStart = localStorage.getItem('l_mirrorcell:firstStart');

    //Check to see if its the applications first start up, if it is,
    //reload immediately to get a fresh start
    if(SmartReload._options.reload.firstStart && !firstStart) {
        console.log(tag, "First Start Of App, Refresh Immediately");

        localStorage.setItem('l_mirrorcell:firstStart', 'done');
        return reload();

    } else {
        console.log(tag, "Not First Start, lets start the idle tracker");

        //Router blacklist -- if enabled and on a blacklisted page, will wait until Template refresh
        if(SmartReload._options.reload.router && !onReloadTemplate.get()) {
            console.log(tag, "Excluded Reload Template, Wait On Template Refresh To Reload");

            myRetry = retry;
            hasRetry.set(true);

            return [false];
        }

        //Upcoming selector options
        /*if(SmartReload._options.reload.selector){

         }*/


        //If Idle Tracking is enabled, check if user is idle before updating
        if(SmartReload._options.reload.idle) {
            console.log(tag, "Idle Option Enabled, waiting for user to be idle before updating");
            //If User is Active, go ahead and defer the reload till they become idle
            //or if they are not active, go ahead and reload immediately
            if(IdleWatcher.isActive()) {
                startIdleTracker();
                myRetry = retry;
                hasRetry.set(true);
                return [false];
            }
        }


        return reload();


    }
}

//Utils
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
