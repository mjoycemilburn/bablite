/* for details of how to access Firestore v8 browser module libraries see https://firebase.google.com/docs/web/setup*/

import { firebaseApp } from './firebase_config';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, setPersistence, browserSessionPersistence, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, query, getDocs, where, orderBy, addDoc, doc, setDoc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore/lite';
/*
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, setPersistence, browserSessionPersistence, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.1.3/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator, collection, query, getDocs, where, orderBy, addDoc, doc, setDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js';
*/

// bind functions that you want to reference in html to the associated buttons
// see https://stackoverflow.com/questions/53630310/use-functions-defined-in-es6-module-directly-in-html
// need to do this for all html/module clickable links

document.getElementById('pbutton').onclick = function () { toggleAudio() };
document.getElementById('nbutton').onclick = function () { pauseAudio(); displayInsertNotePanel() };
document.getElementById('rbutton').onclick = function () { rewindAudio() };
document.getElementById('playline').oninput = function () { setAudioAfterClickOnPlayLine() };
document.getElementById('playline').onwheel = function (e) { setAudioAfterWheelOnPlayline(e) };
document.getElementById('jotterbutton').onclick = function () { displayJotter() };
document.getElementById('searchbutton').onclick = function () { displayTextsAndNotesSearchScreen() };
document.getElementById('dictionarybutton').onclick = function () { z() };
document.getElementById('translatebutton').onclick = function () { zz() };
document.getElementById('aboutbutton').onclick = function () { displayAboutPanel() };
document.getElementById('regressgdpbutton').onclick = function () { regressGeneralDisplayBlock() };
document.getElementById('jottersavebutton').onclick = function () { saveJotter() };

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/*

if (location.hostname === "localhost") { // see https://firebase.google.com/codelabs/firebase-emulator#2
    console.log("localhost detected!");
    connectFirestoreEmulator(db, 'localhost', 8080); // see https://firebase.google.com/docs/emulator-suite/connect_firestore#web-version-9
}
*/

// major globals

var currProg = {}; // object representing the currently-selected programme
var textTypes = []; // array of Text Type objects

// note the php code below creates backup files in ngatesystems.com/beagairbheag/php
// and overwrites files if they already exist

// backupCollection("programmeTexts");
// backupCollection("programmes");
// backupCollection("textTypes");
// backupCollection("userJotter");
// backupCollection("userNotes");

// note really also need a routine that scrapes programmeContent for all programmeTexts

initialiseCurrentProgramme();
initialiseLoginForm();
initialiseWorkingStorage();

async function initialiseWorkingStorage() {

    // display spinner until initialisation complete

    showSpinner();
    const promise1 = buildTextTypesArray();
    const promise2 = buildPicklists();
    await promise1;
    await promise2;
    hideSpinner();
    document.getElementById('page1').style.display = "block";
    document.getElementById('loginbutton').onclick = function () { loginUser() };
    document.getElementById('submitbutton').onclick = function () { submitUserRegistration() };
    
}

function initialiseCurrentProgramme() {

    // set current episode details to those of the last episode used, if available.
    // use myStorage = window.localStorage; myStorage.setItem("lastSeriesNum", null); to reset to default episode.

    let myStorage = window.localStorage;
    if (typeof (myStorage.getItem("lastSeriesNum")) == "string") {
        currProg.seriesNum = myStorage.getItem("lastSeriesNum");
        currProg.episodeNam = myStorage.getItem("lastEpisodeNam");
        currProg.learnerOfTheWeek = myStorage.getItem("lastLearnerOfTheWeek");
        currProg.audioElementDuration = myStorage.getItem("lastAudioElementDuration");
        currProg.audioElement = myStorage.getItem("lastAudioElement");
    } else { // otherwise default to series 12, episode 1
        currProg.seriesNum = "12";
        currProg.episodeNam = "Episode 1"
        currProg.learnerOfTheWeek = "Kevin Leetion";
        currProg.audioElementDuration = timeToSeconds(5421); // initial estimate - this will get upgraded once the audio element loads
        currProg.audioElement = "/assets/audiofiles/Ser12Episode 1.mp3";
    }

}

var email = ' ';
var password;
var user;

function initialiseLoginForm() {

    let myStorage = window.localStorage;
    if (myStorage.getItem("loginemail") !== null && myStorage.getItem("loginpassword") !== null) {

        document.getElementById('loginemail').value = myStorage.getItem("loginemail");
        document.getElementById('loginpassword').value = myStorage.getItem("loginpassword");

    }
}

async function buildTextTypesArray() {
    try {
        const textTypesCollRef = collection(db, 'textTypes');
        const textTypesSnapshot = await getDocs(textTypesCollRef);
        textTypesSnapshot.forEach((myDoc) => {
            textTypes[myDoc.data().textType] = { textColor: myDoc.data().textColor, textHeader: myDoc.data().textHeader };
        });
    } catch (e) {
        console.log("Error getting document1:", e);
    }

}

async function buildPicklists() {

    let seriesPicklist = "<select id='seriespicklist' class='picker' size='1'>";
    const programmesCollRef = collection(db, 'programmes');
    try {
        let programmesQuery = query(programmesCollRef, orderBy("seriesNum", "desc"));
        const programmesSnapshot = await getDocs(programmesQuery);
        var lastSeriesNum = 0;
        programmesSnapshot.forEach((myDoc) => {
            if (lastSeriesNum != myDoc.data().seriesNum) {
                if (myDoc.data().seriesNum == currProg.seriesNum) {
                    seriesPicklist += "<option value='" + myDoc.data().seriesNum + "' selected >Series " + myDoc.data().seriesNum + "</option>";
                } else {
                    seriesPicklist += "<option value='" + myDoc.data().seriesNum + "'>Series " + myDoc.data().seriesNum + "</option>";
                }
                lastSeriesNum = myDoc.data().seriesNum;
            }
        });

        seriesPicklist += "</select>";
        document.getElementById('seriespicklistspan').innerHTML = seriesPicklist;
        // another function binding - this can only be applied after the picklists have been constructed
        // so can't be launched at the head of the .js element along with the other "static" bindings
        document.getElementById('seriespicklist').addEventListener('change', changeSeries);

    } catch (e) {
        console.log("Error getting document2:", e);
    }

    let episodesPicklist = "<select id='episodespicklist' class='picker' size='1'>";
    try {
        const episodesQuery = query(programmesCollRef, where("seriesNum", "==", currProg.seriesNum), orderBy("firstOnDate", "desc"));
        const episodesSnapshot = await getDocs(episodesQuery);
        // order by episode_nam doesn't work as "episode 10" sorts before "episode 2". Use "firstOnDate" instead
        // and set sort order to descending
        episodesSnapshot.forEach((myDoc) => {
            if (myDoc.data().seriesNum == currProg.seriesNum) {
                if (myDoc.data().episodeNam == currProg.episodeNam) {
                    episodesPicklist += "<option value='" + myDoc.data().episodeNam + "' selected>" + myDoc.data().episodeNam + "</option>";
                } else {
                    episodesPicklist += "<option value='" + myDoc.data().episodeNam + "'>" + myDoc.data().episodeNam + "</option>";
                }
            }
        });

        episodesPicklist += "</select>";
        document.getElementById('episodespicklistspan').innerHTML = episodesPicklist;
        // another function binding - this can only be applied after the picklists have been constructed
        // so can't be launched at the head of the .js element along with the other "static" bindings
        document.getElementById('episodespicklist').addEventListener('change', changeEpisode);

    } catch (e) {
        console.log("Error getting document3:", e);
    }
}

function loginUser() {

    email = document.getElementById('loginemail').value;
    password = document.getElementById('loginpassword').value;

    setPersistence(auth, browserSessionPersistence)
        .then(() => {

            // Existing and future Auth states are now persisted in the current
            // session only. Closing the window would clear any existing state even
            // if a user forgets to sign out.
            // ...
            // New sign-in will be persisted with session persistence.

            signInWithEmailAndPassword(auth, email, password)
                .then( (userCredential) => {

                    // Save credentials in local storage

                    let myStorage = window.localStorage;
                    myStorage.setItem("loginemail", email);
                    myStorage.setItem("loginpassword", password);

                    // Signed in
                    user = userCredential.user;
                    if (user !== null) {
                        // The user object has basic properties such as display name, email, etc.
                        // const displayName = user.displayName;
                        email = user.email;
                        // const photoURL = user.photoURL;
                        // const emailVerified = user.emailVerified;

                        // The user's ID, unique to the Firebase project. Do NOT use
                        // this value to authenticate with your backend server, if
                        // you have one. Use User.getToken() instead.
                        const uid = user.uid;

                    }

                    revealPage2(); // note that this reveals the spinner while we populate the rest of the page

                    //restoreCollection("textTypes"); // note need to run under "admin" login
                    //restoreCollection("programmes"); // note need to run under "admin" login
                    //restoreCollection("programmeTexts"); // note need to run under "admin" login
                    //restoreCollection("userNotes"); // note need to run under "admin" login
                    //restoreCollection("userJotter"); // note need to run under "admin" login

                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    alert(errorMessage);
                });
        })
}

function submitUserRegistration() {

    email = document.getElementById('registrationemail').value;
    password = document.getElementById('registrationpassword').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            user = userCredential.user;

            // Save credentials in local storage

            let myStorage = window.localStorage;
            myStorage.setItem("loginemail", email);
            myStorage.setItem("loginpassword", password);

            revealPage2();

            // ...
        })
        .catch((error) => {
            var errorCode = error.code;
            var errorMessage = error.message;
            alert(errorCode + " " + errorMessage);
        });
}

var currentTexts = []; // array of programmeText objects for the current programme

const playerblock = document.getElementById('playerblock');
const toolsblock = document.getElementById('toolsblock');
const generaldisplayblock = document.getElementById('generaldisplayblock');
var gdpFontSize;

var programmeDetailsPanel;
var textPanel;

function revealPage2() {

    // todo - really need a check here to confirm that the asynch functions that
    // were launched earlier to build the texttypes array and picklists have finished  

    document.getElementById('page1').style.display = "none";

    document.getElementById('page2').style.display = "block";
    positionGDPElements();

    // Get the the css thumbWidth from the playline's playlinethumb style.
    // This is important to the dynamic construction
    // of the text and note lines and is also used multiply within the playline
    // formatting to accommodate browser-specific settings of the noteline styles

    thumbWidth = getComputedStyle(document.getElementById("playline")).getPropertyValue("--thumbWidth");
    thumbWidth = thumbWidth.substring(0, thumbWidth.length - 3); // strip off the "rem" bit

    // use the gdpFontSize calculated in positionGDPElements to convert this to px then set the thumbWidth
    // variable in the progressbar stylesheet
    thumbWidth = thumbWidth * gdpFontSize;

    rootElement = (document.querySelector(':root')).style.setProperty('--thumbWidth', thumbWidth + "px");
    playlineWidth = document.getElementById('playline').offsetWidth;

    displayProgramme(currProg.seriesNum, currProg.episodeNam, false);

}

function positionGDPElements() {

    // first, set the gdp height to fit in the remaining space on the bottom of the screen. Unless
    // the height is set explicitly you won't get a scroll-bar when you fill it with more than it can
    // accommodate - and we never know how exactly much text we're going to put in. This way we can be
    // sure that it will always scroll. Experience suggests that it's best if the lower border of the
    // panel is actually visible on the screen - scrolling characteristics for lines are such that
    // the last visible line is often only half-visible and it's best if this happens when it's 
    // bisected by the bottom margin rather than jus "disappearing off the screen". AT least this way
    // you know whats happening. So - having worked out the space available, subtract 1rem

    let windowHeight = window.innerHeight;
    let toolsBlockRect = toolsblock.getBoundingClientRect();

    // get the size of a rem. We want to do a computation on this and it's currently a string such as "16px",
    // so strip off the "px" but and convert to a number
    gdpFontSize = window.getComputedStyle(generaldisplayblock).getPropertyValue('font-size');
    gdpFontSize = parseInt(gdpFontSize.substring(0, gdpFontSize.length - 2));

    // calculate the number of rem that can be displayed inside the gdp

    let gdpWidthRemCapacity = generaldisplayblock.clientWidth / gdpFontSize;

    // the gdp is sized, by default, for display on an iphone that can't manage more than 21 rem. On a larger device,
    // the gdp capacity is typically in excess of 75. In such a case, the gdp is too wide for comfort. The answer
    // seems to be to size it so that it will take 30 rem - and also round the corners so that things look less spartan.

    if (gdpWidthRemCapacity > 30) {
        generaldisplayblock.style.width = 95 * (30 / 75) + "%";
        generaldisplayblock.style.borderRadius = "8px";
        generaldisplayblock.style.marginTop = "1rem";
    }

    generaldisplayblock.style.height = windowHeight - toolsBlockRect.bottom - gdpFontSize + "px";;

    let gdpRect = generaldisplayblock.getBoundingClientRect();

    // The style of the spinner is fixed, ie it's positioned relative to the browser window. It is already
    // centered so we just need to set the y position as gdp.top + 3rem. 

    document.getElementById('spinner').style.top = gdpRect.top + (3 * gdpFontSize) + "px";

    // The style of the regresbutton is also fixed. Position it 1.5 rem below the top of the gdp and 
    // 5% window width from the right

    document.getElementById('regressgdpbutton').style.top = gdpRect.top + (1.5 * gdpFontSize) + "px";
    document.getElementById('regressgdpbutton').style.right = .05 * window.outerWidth + "px";

    // likewise the jottercontrols -1.5 rem below the top of the gdp

    document.getElementById('jottercontrols').style.top = gdpRect.top + (1.5 * gdpFontSize) + "px";

}

function changeSeries() {
    // Series Number has been changed, redraw the picklists with the
    // episodes for the new series and the currently-defined episode

    let seriespicklist = document.getElementById('seriespicklist');
    currProg.seriesNum = seriespicklist.options[seriespicklist.selectedIndex].value;

    pauseAudio();
    currProg.audioElement = "/assets/audiofiles/Ser" + currProg.seriesNum + currProg.episodeNam + ".mp3";
    displayProgramme(currProg.seriesNum, currProg.episodeNam, false);

}

function changeEpisode() {
    // Episode Number has changed; rebuild the screen for the current audio

    var episodespicklist = document.getElementById('episodespicklist');
    currProg.episodeNam = episodespicklist.options[episodespicklist.selectedIndex].value;
    currProg.audioElement = "/assets/audiofiles/Ser" + currProg.seriesNum + currProg.episodeNam + ".mp3";

    displayProgramme(currProg.seriesNum, currProg.episodeNam, false);

}

function displayProgramme(newSeriesNum, newEpisodeNam, callDisplayTextOnCompletion, startTimeInProgramme, searchText) {

    // Format the screen for the new Series and Episode. If callDisplayTextOnCompletion is true, the 
    // displayCurrentProgrammeDetails call will schedule a call to the displayText function 
    // to display the text specified by startTimeInProgramme

    // save details of the current episode in local storage

    let myStorage = window.localStorage;
    myStorage.setItem("lastSeriesNum", currProg.seriesNum);
    myStorage.setItem("lastEpisodeNam", currProg.episodeNam);
    myStorage.setItem("lastLearnerOfTheWeek", currProg.learnerOfTheWeek);
    myStorage.setItem("lastAudioElementDuration", currProg.audioElementDuration);
    myStorage.setItem("lastAudioElement", currProg.audioElement);

    currProg.seriesNum = newSeriesNum;
    currProg.episodeNam = newEpisodeNam;

    displayCurrentProgrammeDetails(0, callDisplayTextOnCompletion, startTimeInProgramme, searchText);
}

//////////////////////////  Programme Stuff ////////////////////////

var audioelement = document.getElementById('audioelement');

var thumbWidth;
var rootElement;
var playlineWidth;

async function displayCurrentProgrammeDetails(audioStartTime, callDisplayTextOnCompletion, startTimeInProgramme, searchText) {

    // stop any current audio

    pauseAudio();

    audioelement.src = currProg.audioElement;
    audioelement.addEventListener("timeupdate", thumbAnimation);

    const programmesCollRef = collection(db, 'programmes');
    const programmesQuery = query(programmesCollRef, where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam));
    const programmesSnapshot = await getDocs(programmesQuery);
    programmesSnapshot.forEach((myDoc) => { // there should only be one!
        currProg.audioElementDuration = timeToSeconds(myDoc.data().finishTime);
        currProg.learnerOfTheWeek = myDoc.data().learnerOfTheWeek;
    });

    audioelement.onloadedmetadata = function () {
        document.getElementById('playline').max = audioelement.duration.toString();
        document.getElementById('finishtime').innerHTML = formatTime(Math.floor(audioelement.duration));
        currProg.audioElementDuration = audioelement.duration;
    };

    audioelement.currentTime = audioStartTime;
    document.getElementById('playline').max = currProg.audioElementDuration;
    document.getElementById('finishtime').innerHTML = formatTime(Math.floor(currProg.audioElementDuration)); // temporary fix - will get set properly when play starts
    pauseAudio();

    // now build and display the details, texts and notes for the current programme. Addtionally, if
    // callDisplayTextOnCompletion is true, place a call to the displayText function, once the programme setup
    // has been completed

    // We calculate the left margin of a text div at time t seconds as :
    // (0.5 * thumbWidth) + (t * (playlineWidth - thumbWidth) / duration)
    // or t*scaleFactor + scaleCorrectionForText
    // We calculate the length of a text as rightMargin - leftMargin

    let scaleFactor = (playlineWidth - thumbWidth) / currProg.audioElementDuration;
    let scaleCorrectionForText = (0.5 * thumbWidth);
    let textsLine = "";

    generalDisplayBlockContentHistory = [];
    document.getElementById('regressgdpbutton').style.display = "none";

    currentTexts.length = 0;
    let textsIndex = 0;

    // Display Learner of the Week for this programme
    let learnerOfTheWeekSpan = "<span style='color: red;'>" + currProg.learnerOfTheWeek + "</span>";
    programmeDetailsPanel = "<div><p style='text-align: center; margin-top: 0; color: blue; font-weight: bold;'>Learner of the Week: " + learnerOfTheWeekSpan + "</p>";

    // Display Text links for this programme

    const programmeTextsCollRef = collection(db, 'programmeTexts');
    const programmesTextsQuery = query(programmeTextsCollRef, orderBy("startTimeInProgramme"), where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam));
    const programmeTextsSnapshot = await getDocs(programmesTextsQuery);

    programmeTextsSnapshot.forEach((myDoc) => {

        currentTexts[textsIndex] = {};
        currentTexts[textsIndex].docId = myDoc.id;
        currentTexts[textsIndex].textType = myDoc.data().textType;
        currentTexts[textsIndex].textTitle = myDoc.data().textTitle;
        currentTexts[textsIndex].startTimeInProgramme = myDoc.data().startTimeInProgramme;
        currentTexts[textsIndex].finishTimeInProgramme = myDoc.data().finishTimeInProgramme;
        currentTexts[textsIndex].textContent = myDoc.data().textContent;
        currentTexts[textsIndex].textUrl = myDoc.data().textUrl;

        let startTimeInProgrammeInSeconds = timeToSeconds(currentTexts[textsIndex].startTimeInProgramme);
        let finishTimeInProgrammeInSeconds = timeToSeconds(currentTexts[textsIndex].finishTimeInProgramme);

        let textMarginLeft = (startTimeInProgrammeInSeconds * scaleFactor) + scaleCorrectionForText + "px";
        let textWidth = (finishTimeInProgrammeInSeconds - startTimeInProgrammeInSeconds) * scaleFactor + "px";
        let textColor = textTypes[currentTexts[textsIndex].textType].textColor;

        // note the use of data- fields below to allow us to get the function parameters defined even tho we've not
        // attached the function yet - courtesy https://stackoverflow.com/questions/69720620/use-parameterised-functions-defined-in-es6-module-directly-in-html

        let textData = "data-seriesnum='" + currProg.seriesNum + "' data-episodenam='" + currProg.episodeNam + "' data-starttimeinprogramme='" + myDoc.data().startTimeInProgramme + "'";

        textsLine += `<a id='textlinetext` + textsIndex + `' style='position: absolute; margin-left: ` + textMarginLeft + `; width: ` + textWidth + `; height: 1.25rem; background: ` + textColor + `; cursor: pointer;' `
            + textData + `</a>`;

        programmeDetailsPanel += `<div id="textpaneltext` + textsIndex + `" style="display: flex; align-items: center; width: 20rem; margin-left: auto; margin-right: auto; cursor: pointer;" `
            + textData + `">
                                          <p style="display: inline-block; width: 3rem; height: 1.25rem; margin: .5rem 2rem 0 0; background-color: ` + textColor + `; margin-right: 2rem"></p>
                                          <p style="width: 15rem; margin: .5rem 0 0 0;">` + textTypes[myDoc.data().textType].textHeader + ` : ` + currentTexts[textsIndex].textTitle + `</p>
                                      </div>`;

        textsIndex++;

    })

    document.getElementById('textsline').innerHTML = textsLine;

    // now that the text link elements are defined, create bindings for them

    for (let i = 0; i < textsIndex; i++) {
        //  document.getElementById('textlinetext' + i).addEventListener('click', function () { displayText(this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam'), this.getAttribute('data-starttimeinprogramme'), '') });
        document.getElementById('textlinetext' + i).onclick = function () { displayText(this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam'), this.getAttribute('data-starttimeinprogramme'), '') };
    }

    // Add Note Links to programmeDetailsPanel for this user and this programme

    programmeDetailsPanel += "<p style='text-align: center; color: blue; font-weight: bold;'>Programme Notes</p>";
    let noteCount = 0;

    const userNotesCollRef = collection(db, 'userNotes');
    const userNotesQuery = query(userNotesCollRef, orderBy("noteSeconds"), where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam), where("email", "==", email));
    const userNotesSnapshot = await getDocs(userNotesQuery);
    userNotesSnapshot.forEach((myDoc) => {

        let noteData = "data-noteseconds='" + myDoc.data().noteSeconds + "' data-seriesnum='" + currProg.seriesNum + "' data-episodenam='" + currProg.episodeNam + "' ";
        let noteTypeSpan = "<span>" + myDoc.data().noteType + "</span>";
        if (myDoc.data().noteType == "query") noteTypeSpan = "<span style='color: red; font-weight: bold;'>" + myDoc.data().noteType + "</span>";

        programmeDetailsPanel += `<p id="textpanelnote` + noteCount + `" style="width: 20rem; margin: 0 auto .5rem auto;cursor: pointer;"`
            + noteData + `">` +
            formatTime(myDoc.data().noteSeconds) + ` - ` + noteTypeSpan + ` : ` + myDoc.data().noteText + `</p>`;
        noteCount++;
    });

    if (noteCount == 0) programmeDetailsPanel += "<p style='text-align: center;'>You have no Notes for this programme</p>";


    programmeDetailsPanel += '</div>';
    updateGeneralDisplayBlock(programmeDetailsPanel, "programmedetailspanel");

    // now that the textpaneltext link elements are defined, create bindings for them

    for (let i = 0; i < textsIndex; i++) {

        document.getElementById('textpaneltext' + i).onclick = function () { displayText(this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam'), this.getAttribute('data-starttimeinprogramme'), '') };

    }

    // ditto for the textpanelnote link elements

    for (let i = 0; i < noteCount; i++) {

        document.getElementById('textpanelnote' + i).onclick = function () { playBiteInEditPanel(this.getAttribute('data-noteseconds')); displayEditNotePanel(this.getAttribute('data-noteseconds'), this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam')); };

    }

    hideSpinner();

    // if a text is to be displayed instead, launch the displayText function

    if (callDisplayTextOnCompletion) displayText(currProg.seriesNum, currProg.episodeNam, startTimeInProgramme, searchText);

}

var generalDisplayBlockContentHistory = [];

function updateGeneralDisplayBlock(htmlContent, contentType) {
    // replace the current content of the GDB with htmlContent and add this to the GDB History
    document.getElementById('generaldisplayblock').innerHTML = htmlContent;
    generalDisplayBlockContentHistory.push({ "htmlContent": htmlContent, "contentType": contentType });

    if (generalDisplayBlockContentHistory.length > 1) document.getElementById('regressgdpbutton').style.display = "inline-flex";
    if (contentType != "jotterpanel") document.getElementById('jottercontrols').style.display = "none";

    hideSpinner();
}

function regressGeneralDisplayBlock() {
    // replace the current content of the GDB with whatever it held previously

    // check for unsaved jotter changes

    if (generalDisplayBlockContentHistory[generalDisplayBlockContentHistory.length - 1].contentType == "jotterpanel"
        && userJotterChanged) {
        if (confirm("Your jotter contains unsaved changes : Proceed?")) {
        } else {
            return;
        }
    }

    generalDisplayBlockContentHistory.length--;
    document.getElementById('generaldisplayblock').innerHTML = generalDisplayBlockContentHistory[generalDisplayBlockContentHistory.length - 1].htmlContent;
    if (generalDisplayBlockContentHistory[generalDisplayBlockContentHistory.length - 1].contentType == "jotterpanel") {
        document.getElementById('jottercontrols').style.display = "inline-flex";
    } else {
        document.getElementById('jottercontrols').style.display = "none";
    }

    if (generalDisplayBlockContentHistory.length == 1) {
        document.getElementById('regressgdpbutton').style.display = "none";

        // we must be back at the programmedetails panel now and we'll have lost its event listeners, so recreate it

        displayCurrentProgrammeDetails(0, false);
    }

}

//////////////////////////  Text Stuff ////////////////////////

function displayText(seriesNum, episodeNam, startTimeInProgramme, searchText) {

    // bablite won't necessarily be synchronised with the programme we're trying to display (we
    // may be following a link from a texts search), so start by getting the correct programme
    // in the frame. 

    if (seriesNum != currProg.seriesNum || episodeNam != currProg.episodeNam) {
        // in order to ensure that details for the new programme have been correctly initialised before
        // we hit the texts display code that follows the (asynchronous) displayProgramme call, arrange
        // for displayProgramme to be called in a way that schedules re-entry displayText call once it has
        // completed and currProg.seriesNum and currProg.episodeNam are now  and episodeNam
        let callDisplayTextOnCompletion = true;
        displayProgramme(seriesNum, episodeNam, callDisplayTextOnCompletion, startTimeInProgramme, searchText);
        return;
    }

    // All the texts for the current programme are now in the currentTexts array. Get the textsIndex for
    // the element that contains the text that starts at startTimeInProgramme

    let textsIndex;
    for (let i = 0; i < currentTexts.length; i++) {
        if (currentTexts[i].startTimeInProgramme == startTimeInProgramme) {
            textsIndex = i;
            break;
        }
    }

    // position audio at currentTexts[textsIndex].startTimeInProgramme[textsIndex]

    setAudioAfterClickOnText(textsIndex);

    if (currentTexts[textsIndex].textContent != undefined) {

        // get set to display the text

        // if searchString is defined, highlight occurrences. This is slightly tedious as we're
        // doing case-insensitive matches and therefore have to do case-insensitive searches in retrievedText
        // to find the bits to be highlighted. See https://stackoverflow.com/questions/52175779/how-can-i-perform-a-case-insensitive-replace-in-javascript
        // for the source of the following trick

        let massagedText = currentTexts[textsIndex].textContent;

        if (searchText != '') {
            // ensure we're not replacing instances of searchtext within their associated z() calls
            let searchRegex = new RegExp('>' + searchText + "<", "gi");
            massagedText = currentTexts[textsIndex].textContent.replace(searchRegex, '><b style ="color: red;"$&/b><');
        }

        textPanel = "<strong>" + textTypes[currentTexts[textsIndex].textType].textHeader + " : " + currentTexts[textsIndex].textTitle + "</strong>" + massagedText;
        updateGeneralDisplayBlock(textPanel, "textpanel");

    } else {

        // if the textContent hasn't been defined, use the screen scraping technique pioneered in
        // beagairbheag to create it using the programmeText's url (note - can only do this in php)

        showSpinner();

        var form = document.createElement("form");
        var oData = new FormData(form);
        oData.append("helper_type", "get_transcript_source");
        oData.append("url", currentTexts[textsIndex].textUrl);
        var oReq = new XMLHttpRequest();
        oReq.open("POST", "https://ngatesystems.com/beagairbheag/php/player_helpers_v1.20.php", true);
        oReq.onload = async function (oEvent) {
            if (oReq.status == 200) {

                var response = oReq.responseText;
                if (response.indexOf("%failed%") != -1) {
                    alert(response);
                } else {

                    // scrape the text content from the url source

                    currentTexts[textsIndex].textContent = autoEditText(response);

                    textPanel = "<strong>" + textTypes[currentTexts[textsIndex].textType].textHeader + " : " + currentTexts[textsIndex].textTitle + "</strong>";
                    textPanel += "<p>" + currentTexts[textsIndex].textContent + "</p>";

                    updateGeneralDisplayBlock(textPanel, "textpanel");

                    // squirrel the data away in the programmeTexts collection

                    const programmeTextsCol = collection(db, 'programmeTexts');
                    const programmeTextsQuery = query(programmeTextsCol, where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam), where("textType", "==", currentTexts[textsIndex].textType), where("textTitle", "==", currentTexts[textsIndex].textTitle));
                    const programmeTextSnapshot = await getDocs(programmeTextsQuery);
                    programmeTextSnapshot.forEach(async (myDoc) => {
                        await setDoc(myDoc.ref, {
                            textContent: currentTexts[textsIndex].textContent
                        }, { merge: true });
                    });

                }
            }
        };

        oReq.send(oData);

    }
}

function showSpinner() {
    document.getElementById('spinner').style.display = "block";
}

function hideSpinner() {
    document.getElementById('spinner').style.display = "none";
}

function autoEditText(localInput) {

    let localInputLength;
    let paraStart;
    let paraEnd;
    let output = '';

    let outOfParas = false;
    let input = '';

    while (!outOfParas) {

        localInputLength = localInput.length;
        // get position of first <p>
        paraStart = localInput.indexOf("<p>");

        if (paraStart == -1) {

            outOfParas = true;

        } else {

            // ignore text before this point
            localInput = localInput.substring(paraStart, localInputLength);
            localInputLength = localInput.length;
            // get position of companion  </p>
            paraEnd = localInput.indexOf("</p>");
            // tuck away everything up to this point
            output = output + localInput.substring(0, paraEnd + 4);
            // ignore text before this point
            localInput = localInput.substring(paraEnd + 4, localInputLength);

        }
        // change any ʼ characters to ' - they just get in the way!
        output = output.replace(/ʼ/g, "'");
        output = output.replace(/‘/g, "'");

    }

    // accented letters in the BBC texts are coded as html entities - eg è will be coded
    // as &egrave; We're using ISO codes in searches and notes, so we need to replace these

    output = output.replace(/&agrave;/g, "à");
    output = output.replace(/&egrave;/g, "è");
    output = output.replace(/&igrave;/g, "ì");
    output = output.replace(/&ograve;/g, "ò");
    output = output.replace(/&ugrave;/g, "ù");
    output = output.replace(/&igrave;/g, "ì");

    // In early versions of Bab the tried-and-tested Cairnwell technique was used to direct a
    // double-click on a word into the online dictionaries. Unfortunately this doesn't work
    // on touch-screen devices where neither onclick nor onselect seem to be available to
    // the web browser - certainly on an iphone, the events are picked up by the OS and
    // handed to cut and paste code. So in the current design, you need to "prepare" the text
    // by adding html code to convert words you might want to lookup in the dictionary into anchor
    // (<a>) links. This will be a bit 'rough and ready' as it's going to be hard to annotate
    // only words a user might want to look up and so well generate lots of unnecessary code - 
    // but hey ho! 

    // The general strategy now is to manipulate the output string into a state where we can 
    // use "split" to separate out all space-delimited words into an array, then recombine
    // these having turned the words into anchor elements. But there are several snags. Firstly,
    // the texts contain html which, on the one hand isn't space-delimited and, on the other,
    // contains its own space-delimited fields, which we don't want to turn into anchors. 

    // Start by adding separator spaces to any Gaelic word prefixes (eg dh').

    output = output.replace(/ dh'/g, " dh' ");
    output = output.replace(/ a'/g, " a' ");
    output = output.replace(/ th'/g, " th' ");
    output = output.replace(/ h-/g, " h- ");
    output = output.replace(/ t-/g, " t- ");

    // Now deal with the html - there are two situations : simple html tags like <strong> and complex
    // brutes like <a href = "https://learngaelic.scot" title = "Gaelic Teaching site">learngaelic.scot</a>
    // which contain spaces that will ruin the "split" stage and . characters that will look like they are
    // a delimiter. Handle this by changing them to # and ^ respectively

    let outputArray = output.split(""); // outputArray is now the individual characters of output string
    let spacedOutput = "";

    for (let i = 0; i < output.length; i++) {

        if (outputArray[i] == "<") { //tag identified as implicit word delimiter
            if (outputArray[i + 1] == "a" || outputArray[i + 1] + outputArray[i + 2] == "br") { // complex html tags
                spacedOutput += '<';
                i++
                for (let j = i; j < output.length; j++) {
                    if (outputArray[j] == " ") outputArray[j] = "#";
                    if (outputArray[j] == ".") outputArray[j] = "^";
                    if (outputArray[j] + outputArray[j + 1] == "/>" || outputArray[j] + outputArray[j + 1] == "a>") {
                        spacedOutput += outputArray[j] + outputArray[j + 1] + " ";
                        i = j + 1;
                        break;
                    } else {
                        spacedOutput += outputArray[j];
                    }
                }

            } else { // simple html tag
                if (outputArray[i + 1] == "/") {
                    spacedOutput += ' </';
                    i++;
                } else {
                    spacedOutput += ' <';
                }
                i++;
                for (let j = i; j < output.length; j++) {
                    if (outputArray[j] == ">") {
                        spacedOutput += "> ";
                        i = j;
                        break;
                    } else {
                        spacedOutput += outputArray[j];
                    }
                }
            }
        } else {
            switch (outputArray[i]) {

                case ",": // simple delimiters
                    spacedOutput += " " + outputArray[i];
                    break;
                case ".":
                    spacedOutput += " " + outputArray[i];
                    break;
                case "!":
                    spacedOutput += " " + outputArray[i];
                    break;
                case "?":
                    spacedOutput += " " + outputArray[i];
                    break;
                default:
                    spacedOutput += outputArray[i];
            }
        }
    }

    // now "explode" the text to get all the "words" 

    outputArray = spacedOutput.split(' ');

    // and now put the text back together again adding <a> references to everything except 
    // for html strings and words we recognise as unnecessary

    output = "";

    let lastChar = '';

    outputArray.forEach(function (word, index) {
        lastChar = output.charAt(output.length - 1);

        switch (word.charAt(0)) {

            case "": // multiple space
                break;
            case "<":
                output += word;
                break;
            case ".":
                if (lastChar == " ") output = output.substring(0, output.length - 1); //strip off the redundant space in front of the sentence terminator
                output += word + " "; // then add the word and a space
                break;
            case ",":
                if (lastChar == " ") output = output.substring(0, output.length - 1); //strip off the redundant space in front of the sentence terminator
                output += word + " "; // then add the word and a space
                break;
            case "?":
                if (lastChar == " ") output = output.substring(0, output.length - 1); //strip off the redundant space in front of the sentence terminator
                output += word + " "; // then add the word and a space
                break;
            case "!":
                if (lastChar == " ") output = output.substring(0, output.length - 1); //strip off the redundant space in front of the sentence terminator
                output += word + " "; // then add the word and a space
                break;
            default:
                output += "<a onclick = \"z('" + word + "');\">" + word + "</a> ";
        };
    });

    // finally, replace those # and ^ characters in the html elements back to space and . respectively

    output = output.replace(/#/g, " ");
    output = output.replace(/\^/g, ".");

    return output;

}

function zz() {
    // launch the google translator in a tab, as above

    var translatorWindow = window.open("https://translate.google.com/?sl=gd&tl=enL", "GoogleTranslator");

}

//////////////////////////  Note Stuff ////////////////////////

var postSeconds;

function displayInsertNotePanel() {

    let notePanel = `
        <div style="
                display: flex;
                width: 20rem;
                margin: 1rem auto 0 auto;
                padding-top: .5rem;
                padding-bottom: .5rem;
                border-style: solid;
                border-width: thin;
                justify-content: space-around;">
            <div><button id="lBiteButton" title="Start the sound-bite one second earlier">Nudge L</button></div>
            <div><button id="pBiteButton" title="Play a five-second sound-bite centred on the current time">Play</button></div>
            <div><button id="rBiteButton" title="Start the sound-bite one second later">Nudge R</button></div>
        </div>

        <p style="text-align: center">Note/Query text</p>
        <textarea id="notetext" rows="4" cols="50" style="width: 20rem; margin: 0 auto 0 auto; padding: .25rem; display: block;"
            data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"
            title="Notes on sound - eg 'jay hoorshht e' = dè thuirt e : what did he say?"></textarea>

        <div style="
                display: flex;
                width: 20rem;;
                margin: 1rem auto 0 auto;
                padding-top: .5rem;
                padding-bottom: .5rem;
                border-style: solid;
                border-width: thin;
                justify-content: space-around;">
            <div><button id="insertnotebutton">Save as Note</button></div>
            <div><button id="insertquerybutton">Save as Query</button></div>
            <div><button id="cancelnotebutton">Cancel</button></div>
        </div>`;

    // note on formatting of the textarea : there is currently (2/9/21) a bug in grammarly
    // that errors textareas - see https://stackoverflow.com/questions/37444906/how-to-stop-extensions-add-ons-like-grammarly-on-contenteditable-editors
    // for patch. May be useful anyway as a means of avoiding grammarly grumbles on accents, gaidhlig and onamopoeic entries

    updateGeneralDisplayBlock(notePanel, "notepanel");

    // set up the bindings

    document.getElementById('lBiteButton').onclick = function () { playBiteNudgedLeft(); };
    document.getElementById('pBiteButton').onclick = function () { playBite(); };
    document.getElementById('rBiteButton').onclick = function () { playBiteNudgedRight(); };
    document.getElementById('insertnotebutton').onclick = function () { insertNote('note'); };
    document.getElementById('insertquerybutton').onclick = function () { insertNote('query'); };
    document.getElementById('cancelnotebutton').onclick = function () { regressGeneralDisplayBlock(); };

    // grab the click position that generated this displayInsertNotePanel call
    // and store it in the postSeconds var

    postSeconds = Math.floor(audioelement.currentTime);

}

async function insertNote(noteType) {

    // insert a note of the given type for the current series and episode into the notes datastore

    // first check that there's not already a note at this location

    var noteAlreadyExists = false;

    const userNotesCollRef = collection(db, 'userNotes');
    const userNoteQuery = query(userNotesCollRef, where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam), where("email", "==", email));
    const userNotesSnapshot = await getDocs(userNoteQuery);
    userNotesSnapshot.forEach((myDoc) => {
        if (myDoc.data().noteSeconds == parseInt(postSeconds)) { // passes as string but srored as integer
            alert("Oops - you already have a note at this point in the programme ");
            noteAlreadyExists = true;
        }
    })

    if (!noteAlreadyExists) {

        let userNote = {};

        userNote.email = email;
        userNote.seriesNum = currProg.seriesNum;
        userNote.episodeNam = currProg.episodeNam;
        userNote.noteType = noteType;
        userNote.noteSeconds = parseInt(postSeconds);
        userNote.noteText = document.getElementById('notetext').value

        // squirrel the data away in the userNotes collection

        await runTransaction(db, async (transaction) => {
            await recoverableCollectionCUD('userNotes', 'C', transaction, "", userNote);

        }).catch((error) => { alert("Oops - Transaction failed : " + error) });

        displayCurrentProgrammeDetails(audioelement.currentTime, false);

    }
}

async function displayEditNotePanel(noteSeconds, seriesNum, episodeNam) {

    // Note that we play the soundbite for the note ahead of the call to displayEditNotePanel because on an iphone
    // sound is only played if it's directly triggered by a user click. So this has been added to the onclick that
    // also launches displayEditNotePanel

    // retrieve the note

    const userNotesCollRef = collection(db, 'userNotes');
    const userNotesQuery = query(userNotesCollRef, where("seriesNum", "==", seriesNum), where("episodeNam", "==", episodeNam), where("noteSeconds", "==", parseInt(postSeconds)));
    const userNotesSnapshot = await getDocs(userNotesQuery);
    userNotesSnapshot.forEach((myDoc) => {
        let editNotePanel = `
                <div style='text-align: center; margin-top: 2rem;'>
                      <button id='enBiteButton' type='button'
                          title="Replay the five-second sound-bite centred on this note" onclick="playBiteInEditPanel(` + noteSeconds + `);">Play
                          Again</button>
                  </div>

                  <textarea id='notetext' rows='4' cols='50' style='width: 20rem; margin: 2rem auto 0 auto; padding: .25rem; display: block;'
                      data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"
                      onkeydown="document.getElementById('saveeditednotebutton').style.background = 'pink';">`
            + myDoc.data().noteText + `
                  </textarea>

                  <div  style = 'margin-top: 1rem; text-align: center;'>
                    <button id="saveeditednotebutton" title='Save edited Note' type='button'>Save</button>
                  </div>

                  <div style='
                              display: flex;
                              width: 20rem;;
                              margin: 1rem auto 0 auto;
                              padding-top: .5rem;
                              padding-bottom: .5rem;
                              border-style: solid;
                              border-width: thin;
                              justify-content: space-around;'>
                      <button id='changetoquerybutton' style='display: none;'
                          title='Change note type to "Query"' type='button'>
                          Re-save as Query</button>
                      <button id='changetonotebutton' style='display: none;' title='Change note type to "Note"'
                          type='button'>
                          Re-save as Note</button>
                      <button id='deletenotebutton' title='Delete Note' type='button'>Delete</button>
                      <button id='cancelnoteeditbutton' type='button''>Cancel</button>
                  </div>`;

        updateGeneralDisplayBlock(editNotePanel, "editnotepanel");

        document.getElementById('saveeditednotebutton').onclick = function () { editNote(noteSeconds, myDoc.data().noteType) };

        if (myDoc.data().noteType === "note") {
            document.getElementById('changetoquerybutton').style.display = 'block';
            document.getElementById('changetoquerybutton').onclick = function () { editNote(noteSeconds, "query") };
            document.getElementById('deletenotebutton').onclick = function () { deleteNote(noteSeconds) };
        } else {
            document.getElementById('changetonotebutton').style.display = 'block';
            document.getElementById('changetonotebutton').onclick = function () { editNote(noteSeconds, "note") };
            document.getElementById('deletenotebutton').onclick = function () { deleteNote(noteSeconds) };
        }

        document.getElementById('cancelnoteeditbutton').onclick = function () { regressGeneralDisplayBlock(); };

        // the screen won't necessarily be synchronised with the programme we're trying to display (we
        // may be following a link from a texts search), so start by getting the correct programme
        // in the frame.

        if (seriesNum != currProg.seriesNum || episodeNam != currProg.episodeNam) {
            displayProgramme(seriesNum, episodeNam, false);
        }

    })
}

async function editNote(noteSeconds, noteType) {

    document.getElementById('saveeditednotebutton').style.background = 'initial';

    // replace the text and type of the note at noteId for the current 
    // series and episode in the notes datastore

    let noteText = document.getElementById('notetext').value;

    const userNotesCollRef = collection(db, 'userNotes');
    const userNotesQuery = query(userNotesCollRef, where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam), where("noteSeconds", "==", parseInt(noteSeconds)), where("email", "==", email));
    const userNotesSnapshot = await getDocs(userNotesQuery);
    userNotesSnapshot.forEach(async (myDoc) => {
        await runTransaction(db, async (transaction) => {
            await recoverableCollectionCUD('userNotes', 'U', transaction, myDoc.id, { noteText: noteText, noteType: noteType });

        }).catch((error) => { alert("Oops - Transaction failed : " + error) })
    });

    // and now rebuild the programmeDetailsPanel with the changed note details

    displayCurrentProgrammeDetails(audioelement.currentTime, false);

}

async function deleteNote(noteSeconds) {

    const userNotesCollRef = collection(db, 'userNotes');
    const userNotesQuery = query(userNotesCollRef, where("seriesNum", "==", currProg.seriesNum), where("episodeNam", "==", currProg.episodeNam), where("noteSeconds", "==", parseInt(postSeconds)));
    const userNotesSnapshot = await getDocs(userNotesQuery);
    userNotesSnapshot.forEach(async (myDoc) => {
        await runTransaction(db, async (transaction) => {
            await recoverableCollectionCUD('userNotes', 'D', transaction, myDoc.id, {});

        }).catch((error) => { alert("Oops - Transaction failed : " + error) })
    });

    // and now rebuild the programmeDetailsPanel with the changed note details

    displayCurrentProgrammeDetails(audioelement.currentTime, false);

}

async function recoverableCollectionCUD(collectionName, transactionType, transaction, documentId, dataObject) {

    let collRef = '';
    let docRef = '';

    switch (transactionType) {
        case "C":
            collRef = collection(db, collectionName);
            docRef = doc(collRef);
            documentId = docRef.id
            await transaction.set(docRef, dataObject)
            break;
        case "U":
            docRef = doc(db, collectionName, documentId);
            await transaction.set(docRef, dataObject, { merge: true })
            break;
        case "D":
            docRef = doc(db, collectionName, documentId);
            await transaction.delete(docRef)
            break;
        default:
        return;
    }

    // write a log entry to the recoverableCollectionLogs collection

    let logEntry = dataObject;
    logEntry.userEmail = email;
    logEntry.transactionType = transactionType;
    logEntry.collectionName = collectionName;
    logEntry.documentId = documentId;
    logEntry.timeStamp = serverTimestamp();
    collRef = collection(db, "recoverableCollectionLogs");
    docRef = doc(collRef);
    await transaction.set(docRef, logEntry);

}

/////////////////////////  Jotter Stuff ////////////////////////

var userJotter = {};
var userJotterChanged;
var isCtrl;
var jottersavebutton;

async function displayJotter() {

    // retrieve the user's jotter

    const userJotterCollRef = collection(db, 'userJotter');
    const userJotterQuery = query(userJotterCollRef, where("email", "==", email));
    const userJotterSnapshot = await getDocs(userJotterQuery);

    if (userJotterSnapshot.docs.length == 0) {
        //no jotters for this user (presumably new) - create a blank one

        userJotter.email = email;
        userJotter.jotterText = 'Empty Jotter - Edit freely then click Save to update your personal copy';

        const userJotterDocRef = doc(userJotterCollRef);
        await setDoc(userJotterDocRef, userJotter);

        // call the displayJotter function recursively to save duplicating the code required to reveal the jotter
        displayJotter();

    } else {
        // existing user - retrieve the jotter content
        userJotterSnapshot.forEach((myDoc) => {

            let x = myDoc.data().jotterText;

            userJotter.jotterText = myDoc.data().jotterText;

            let jotterDisplay = `
            <textarea id='userjotter'
                style="width: 100%; height: 100%; margin-top: 2.5rem; background:paleturquoise;"
                spellcheck="false">` + userJotter.jotterText + "</textarea>";

            updateGeneralDisplayBlock(jotterDisplay, "jotterpanel");

            // another function binding that can only be applied after its target has been loaded

            document.getElementById('userjotter').addEventListener('keydown', keyPressedOnJotter);
            document.getElementById('jottersavebutton').style.background = "aquamarine";
            document.getElementById('jottercontrols').style.display = "inline-flex";

            userJotterChanged = false;
            isCtrl = false;

            jottersavebutton = document.getElementById('jottersavebutton');
        });
    }

}

async function saveJotter() {

    // save the user jotter

    const userJotterCollRef = collection(db, 'userJotter');
    const userJotterQuery = query(userJotterCollRef, where("email", "==", email));
    const userJotterSnapshot = await getDocs(userJotterQuery);
    userJotterSnapshot.forEach(async (myDoc) => {
            await setDoc(myDoc.ref, {jotterText: document.getElementById('userjotter').value}, { merge: true });
        });

    isCtrl = false;
    userJotterChanged = false;
    jottersavebutton.style.background = "aquamarine";
}

function keyPressedOnJotter(e) {
    if (e.keyCode == 17) { //17 = ctrl
        isCtrl = true;
        return;
    }
    if (e.keyCode == 83 && isCtrl == true) { // 83 = s
        e.preventDefault(); // suppress the browser's 'save s file' action
        e.stopPropagation();
        saveJotter();
        userJotterChanged = false;
        isCtrl = false;
        return false;
    }
    userJotterChanged = true;
    isCtrl = false;
    jottersavebutton.style.background = "pink";

}

////////////////////////// Toolbar Stuff ////////////////////////

var aboutPanel = `
        <p>The bablite webapp is a study aid designed to help develop Gaelic comprehension skills. It provides access to selected programmes from the Radio nan Gael's long-running Beag air Bheag series. These contains a valuable collection of material suitable for students at all stages of their Gaelic learning journey.</p>
        <p>
        On first use, bablite displays an audio-player tool focussed on the hour-long Episode 1 from Series 12.Alternative episodes can be selected using the picklists at the top of the screen. Currently, bablite provides access to all episodes from series 11 and 12.</p>
        <p>
        The audio player is supported by a number of features designed specially for study purposes. While the position of the playhead can be moved by the usual click, drag and scroll controls, it is also very convenient, when struggling to "decrypt" an audio passage, to have a button that automatically rewinds a few seconds and replays. Just click the "?" button on the control panel above the audio player to trigger the rewind.</p>
        <p>
        Each episode is accompanied by a range of transcripts for key sections of the Gaelic audio. These are accessed by clicking the coloured blobs below the audio timeline and are displayed in a panel below the audio control section. A special feature of the trancripts is that they are linked to the BBC's Gaelic dictionary at https://learngaelic.scot/dictionary - just click on a word and you'll see the dictionary's translation.</p>
        <p>
        Once you've successfully decrypted a passage it's surprisingly easy to forget your hard-won insight, so it's useful to make a note.Just click the ! button on the control panel, "nudge" the soundbite that is thus captured forward and backward until the problem is suitable centred and then key in your explanation. Links to your notes for a programme are displayed below the toolbar. Notes saved as "queries" are highlighted to alert you to translations that you're still thinking about! When selected, the associated soundbite will play and the note details displayed.</p>
        <p>
        More generally, it's very useful to have ready access to a free-format note-taking facility. Tou can use this to paste snippets of useful text copied from transcripts, notes on grammar and suchlike. Every user get a personal "jotter" for this purpose. It comes complete with a built-in search facility and is accessed from the toolbar.</p>
        <p>
        Other entries on the toolbar include a handy link to the Google translator and a search facility that spans your jotter, your notes and all of the programme transcripts.</p><br><br><br>`;

function displayAboutPanel() {

    updateGeneralDisplayBlock(aboutPanel, "aboutpanel");

}

//////////////////////////  Search Stuff ////////////////////////

function displayTextsAndNotesSearchScreen() {

    let textsAndNotesSearchPanel = `
          <div id="textsandnotessearchpanel" style="padding: 2vw; text-align: center;">
            <p> <label>Search for:</label>&nbsp;&nbsp;
                <input id="searchstring" type="text" name="search_words" title="Search string" autofocus size="24">
            </p>
            <p> <button id="searchtextsandnotesbutton">Launch
                    Search</button>&nbsp;&nbsp;&nbsp;</p>
          </div>`;

    updateGeneralDisplayBlock(textsAndNotesSearchPanel, "textsandnotessearchpanel");

    document.getElementById('searchtextsandnotesbutton').onclick = function () { searchTextsAndNotes(); };
    document.getElementById('searchstring').onKeyPress = function () { trackSearchStringEntry() };

}

function trackSearchStringEntry(event) {
    // Empty input enables you to re-submit previous entries from chrome prompt window
    if (event.keyCode == 13) {
        return searchTextsAndNotes();
    } else {
        return true;
    }

}

async function searchTextsAndNotes() {

    showSpinner();

    // search the texts that have been visited (and therefore stored in the indexedDB texts
    // datastore) for matches with searchString. ditto notes

    let searchString = document.getElementById("searchstring").value;
    let ucSearchString = searchString.toUpperCase(); // will need this later 
    let texts = [];

    if (searchString == '') return;
    const programmeTextsCollRef = collection(db, 'programmeTexts');
    const programmeTextsQuery = query(programmeTextsCollRef);
    const programmeTextsSnapshot = await getDocs(programmeTextsQuery);
    let i = 0;
    programmeTextsSnapshot.forEach((myDoc) => {
        texts[i] = {
            seriesNum: myDoc.data().seriesNum,
            episodeNam: myDoc.data().episodeNam,
            textContent: myDoc.data().textContent,
            textType: myDoc.data().textType,
            textTitle: myDoc.data().textTitle,
            startTimeInProgramme: myDoc.data().startTimeInProgramme
        };
        i++;
    });

    let searchResultsPanel = '<div style="text-align: center"><a name="textssection"></a><a href = "#notessection" style = "font-weight: bold; color: blue;">Skip to Notes search results:</a><br><br>';
    let textSearchResultCount = 0;

    for (let i = 0; i < texts.length; i++) {

        if (texts[i].textContent == undefined) continue;

        // OK, so the texts objects are now in texts[i]. First strip any html tags as these cause huge problems when we
        // display a portion of text and get the start of a tagged bit of text (eg a bold section) in the portion
        // without the closing text (or vice versa).

        let strippedText = texts[i].textContent.replace(/<[\s\S]*?>/g, ''); // courtesy of https://stackoverflow.com/questions/5601903/jquery-almost-equivalent-of-phps-strip-tags

        let textHeader = textTypes[texts[i].textType].textHeader;

        let searchTextHeading = "Series " + texts[i].seriesNum + " : " + texts[i].episodeNam + " : " + textHeader + " : " + texts[i].textTitle;

        // create upper-case versions of strippedText (there's already an u/c searchString version)so that we can do case-insensitive searches
        let ucStrippedText = strippedText.toUpperCase();

        for (let pos = ucStrippedText.indexOf(ucSearchString); pos !== -1; pos = ucStrippedText.indexOf(ucSearchString, pos + 1)) {

            textSearchResultCount++;
            // for every text that generates a match(whether in the title or the content) return a pair of table
            // rows(one for title, one fortext-content) that display the match centred in a block of 30 characters 
            // with html that will display the text itself if either of the rows is clicked

            let textSearchResultData = "data-seriesnum='" + texts[i].seriesNum + "' data-episodenam='" + texts[i].episodeNam + "' data-starttimeinprogramme='" + texts[i].startTimeInProgramme + "' data-searchstring='" + searchString + "'";

            searchResultsPanel += '<span id="textsearchresult' + textSearchResultCount + '" style = "cursor: pointer;"' + textSearchResultData + '>... ' + searchTextHeading + ' ...</span><br>';

            let start = Math.max(0, pos - 15);
            let finish = Math.min(strippedText.length, pos + 30);
            let textBlock = strippedText.substring(start, finish)

            // highlight the searchString string in the text block. This is slightly tedious as we're doing
            // case-insensitive matches and therefore have to do another case-insensitive search in textBlock
            // to find the bit to be highlighted.

            let ucTextBlock = textBlock.toUpperCase();
            let posInTextBlock = ucTextBlock.indexOf(ucSearchString);

            let textBlockWithHighlights = textBlock.substring(0, posInTextBlock) +
                "<span style = 'color: red; font-weight:bold;'>" + textBlock.substring(posInTextBlock, posInTextBlock + searchString.length) + "</span>" +
                textBlock.substring(posInTextBlock + searchString.length, textBlock.length);

            searchResultsPanel += '<span style = "cursor: pointer;"' + textSearchResultData + '">... ' + textBlockWithHighlights + ' ... <br><br></span>';

        }
    }

    if (textSearchResultCount === '') {
        searchResultsPanel = "<div style=\'text-align: center;\'>Sorry - no matches found in texts</div>";
    }

    // now search notes

    let searchRegex = new RegExp(searchString, "gi");

    searchResultsPanel += '<a name="notessection"></a><a href = "#textssection" style = "font-weight: bold; color: blue;">Return to Texts search results:</a><br><br>';

    const userNotesCollRef = collection(db, 'userNotes');
    const userNotesQuery = query(userNotesCollRef, where("email", "==", email));
    const userNotesSnapshot = await getDocs(userNotesQuery, where("email", "==", email));
    let notes = [];
    i = 0;

    userNotesSnapshot.forEach((myDoc) => {
        notes[i] = {
            seriesNum: myDoc.data().seriesNum,
            episodeNam: myDoc.data().episodeNam,
            noteSeconds: myDoc.data().noteSeconds,
            noteText: myDoc.data().noteText
        };
        i++;
    });

    let noteSearchResultCount = 0;
    if (notes != undefined) {

        for (let i = 0; i < notes.length; i++) {

            let noteText = notes[i].noteText;
            let ucNoteText = noteText.toUpperCase();

            let pos = ucNoteText.indexOf(ucSearchString);

            if (pos != -1) {

                noteSearchResultCount++;

                searchResultsPanel += "<span>... Series" + notes[i].seriesNum + " : " + notes[i].episodeNam + " at " + formatTime(notes[i].noteSeconds) + " ...</span><br>";

                let start = Math.max(0, pos - 15);
                let finish = Math.min(noteText.length, pos + 30);
                let textBlock = noteText.substring(start, finish)

                let highlightedTextBlock = textBlock.replace(searchRegex, '<b style ="color: red;">$&</b>');

                let noteSearchResultData = "data-noteseconds=" + notes[i].noteSeconds + " data-seriesnum='" + notes[i].seriesNum + "' data-episodenam='" + notes[i].episodeNam + "'";

                searchResultsPanel += `<span id="notesearchresult` + noteSearchResultCount + `" style = 'cursor: pointer;' ` + noteSearchResultData + `> ... ` + highlightedTextBlock + ` ...</span><br><br>`;

            }
        }

        searchResultsPanel += "</div>";

        if (noteSearchResultCount === '') {
            searchResultsPanel = "<div style='text-align: center;'>Sorry - no matches found in texts</div>";
        }
    }

    updateGeneralDisplayBlock(searchResultsPanel, "searchresultpanel");

    // now that the DOM has been updated and search results ids have been added to the DOM, add the bindings

    for (let i = 1; i <= textSearchResultCount; i++) {
        document.getElementById("textsearchresult" + i).onclick = function () { displayText(this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam'), this.getAttribute('data-starttimeinprogramme'), this.getAttribute('data-searchstring')) };
    }

    for (let i = 1; i <= noteSearchResultCount; i++) {
        document.getElementById("notesearchresult" + i).onclick = function () { playBiteInEditPanel(this.getAttribute('data-noteseconds')); displayEditNotePanel(this.getAttribute('data-noteseconds'), this.getAttribute('data-seriesnum'), this.getAttribute('data-episodenam')) };
    }

}

//////////////////////////  Audio Stuff ////////////////////////

var pbutton = document.getElementById('pbutton');

// toggle the audio
function toggleAudio() {

    if (audioelement.paused) {
        playAudio();
    } else {
        pauseAudio();
    }
}

// play the audio
function playAudio() {

    //showSpinner();
    //audioelement.addEventListener("canplay", hideSpinner);
    //audioelement.oncanplay = hideSpinner;
    audioelement.play();
    audioelement.onwaiting = showSpinner;
    audioelement.oncanplay = hideSpinner;
    pbutton.style.backgroundImage = "url('/assets/images/pause.png')";
}

//pause the audio
function pauseAudio() {

    audioelement.pause();
    pbutton.style.backgroundImage = "url('/assets/images/play.png')";
}

var currenttime = document.getElementById("currenttime");

// move the "thumb" along the playbar
function thumbAnimation() {

    playline.value = audioelement.currentTime; // playline.max has been set to range from 0 to currentElementDuration
    currenttime.innerHTML = formatTime(audioelement.currentTime);

    if (audioelement.currentTime >= currProg.audioElementDuration) {
        pbutton.style.backgroundImage = "url('/assets/images/play.png')";
        audioelement.paused = true;
        currenttime.innerHTML = "00:00:00";
        playline.value = 0;
    }
}

// Synchronize audio position after a click on the playline
function setAudioAfterClickOnPlayLine() {

    audioelement.currentTime = playline.value; // playline.max has been set to range from 0 to currentElementDuration
    currenttime.innerHTML = formatTime(audioelement.currentTime);
}

// This function advances or rewinds the playhead by 2 sec in reponse to movements of the mouse wheel
function setAudioAfterWheelOnPlayline(event) {

    if (event.deltaY > 0) {
        audioelement.currentTime -= 2;
    } else {
        audioelement.currentTime += 2;
    }
}

// Synchronize audio position after a click on a text link
function setAudioAfterClickOnText(textsIndex) {

    audioelement.currentTime = timeToSeconds(currentTexts[textsIndex].startTimeInProgramme);
    thumbAnimation();
    currenttime.innerHTML = formatTime(audioelement.currentTime);
}

var rewindTime;

// rewind the audio
function rewindAudio() {

    rewindTime = Math.floor(audioelement.currentTime); // Note positions are integers
    // stop audioelement whether playing or not
    audioelement.pause();
    //rewind 5 seconds then restart and pause at rewindTime
    audioelement.currentTime = Math.max(0, (rewindTime - 5.0));
    audioelement.ontimeupdate = function () {
        restrictAudioElement();
    };
    audioelement.play();
}

// Stop the soundbite when it reaches biteFinishSeconds and reset audioelement.CurrentTime to postSeconds
function restrictAudioElement() {
    // Stop audioelement playing when it reaches rewindTime
    if (audioelement.currentTime > rewindTime) {
        pauseAudio();
        audioelement.ontimeupdate = undefined;
        audioelement.currentTime = rewindTime;
    }
}

var biteStartSeconds;
var biteFinishSeconds;

//Play Soundbite
function playBite() {
    // stop audioelement (if playing), move thumb to bite Startime then start soundbite
    if (!audioelement.paused) {
        // stop audioelement
        audioelementInterrupted = true;
        audioelement.currentTime = biteStartSeconds;
    }
    biteStartSeconds = postSeconds - 5.0;
    biteStartSeconds = Math.max(0, biteStartSeconds);
    biteFinishSeconds = postSeconds;
    audioelement.currentTime = biteStartSeconds;
    audioelement.ontimeupdate = function () {
        restrictSoundbite();
    };
    playAudio();
}

//Play soundbite nudged 1 second left
function playBiteNudgedLeft() {
    
    postSeconds = postSeconds - 1.0;
    biteStartSeconds = postSeconds - 5.0;
    biteStartSeconds = Math.max(0, biteStartSeconds);
    biteFinishSeconds = postSeconds;
    audioelement.currentTime = biteStartSeconds;
    audioelement.ontimeupdate = function () {
        restrictSoundbite();
    };
    playAudio();
}

//Play soundbite nudged 1 second right
function playBiteNudgedRight() {

    postSeconds = postSeconds + 1.0
    biteStartSeconds = postSeconds - 5.0;
    biteStartSeconds = Math.max(0, biteStartSeconds);
    biteFinishSeconds = postSeconds;
    audioelement.currentTime = biteStartSeconds
    audioelement.ontimeupdate = function () {
        restrictSoundbite();
    };
    playAudio();
}

//Play Soundbite in Edit Panel
function playBiteInEditPanel(noteSeconds) {

    postSeconds = noteSeconds;
    if (!audioelement.paused) {
        // stop audioelement
        audioelement.pause();
    }
    audioelement.currentTime = postSeconds;
    document.getElementById("currenttime").innerHTML = formatTime(Math.round(postSeconds));
    biteStartSeconds = postSeconds - 5.0;
    biteStartSeconds = Math.max(0, biteStartSeconds);
    biteFinishSeconds = postSeconds;
    audioelement.currentTime = biteStartSeconds;
    audioelement.ontimeupdate = function () {
        restrictSoundbite();
    };
    playAudio();
}

// Stop the soundbite when it reaches biteFinishSeconds and reset audioelement.CurrentTime to postSeconds
function restrictSoundbite() {
  
    if (audioelement.currentTime > biteFinishSeconds) {
        audioelement.ontimeupdate = undefined;
        pauseAudio();
        audioelement.currentTime = postSeconds;
        document.getElementById("currenttime").innerHTML = formatTime(Math.round(postSeconds));
    }
}

// convert a database coded "time" field (mmss) to seconds
function timeToSeconds(time) {

    var timeSeconds = time % 100;
    var timeMinutes = (time - timeSeconds) / 100;
    return timeMinutes * 60 + timeSeconds;
}

// Formats currentTime in ssssss.ssss as hh:mm:ss : rounds to nearest integer
function formatTime(t) {

    t = Math.round(t);
    var s = t % 60;
    var m = Math.floor(t / 60) % 60;
    var h = Math.floor(t / 3600);
    var tFormatted = normaliseTime(h) + ":" + normaliseTime(m) + ":" + normaliseTime(s);
    return tFormatted;
}

// add a leading zero to a time field if necessary
function normaliseTime(t) {

    var nt = t.toString();
    if (t < 10) {
        nt = "0" + t;
    }
    return nt;
}

//////////////////////////  Utility Stuff ////////////////////////

// Various bits of code that were used during development (and that might be needed again at some point!)

// Code to create a backup for a collection

async function backupCollection(collectionName) {
    let jsonArray = '[';

    let textTypesSnapshot = await db.collection(collectionName).get();
    textTypesSnapshot.forEach((doc) => {
        jsonArray += JSON.stringify(doc.data()) + ",\n";
    });
    jsonArray = jsonArray.substring(0, jsonArray.length - 2) + "]";

    var form = document.createElement("form");
    var oData = new FormData(form);
    oData.append("helper_type", "backup_collection");
    oData.append("collection_name", collectionName);
    oData.append("backup_data", jsonArray);
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "https://ngatesystems.com/beagairbheag/php/player_helpers_v1.20.php", true);
    oReq.onload = function (oEvent) {
        if (oReq.status == 200) {

            var response = oReq.responseText;
            if (response.indexOf("%failed%") != -1) {
                alert(response);
            }
        }
    };
    oReq.send(oData);
}

// utility code to restore a collection from backup

async function restoreCollection(collectionName) {

    var form = document.createElement("form");
    var oData = new FormData(form);
    oData.append("helper_type", "restore_collection");
    oData.append("collection_name", collectionName);
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "https://ngatesystems.com/beagairbheag/php/player_helpers_v1.20.php", true);
    oReq.onload = function (oEvent) {
        if (oReq.status == 200) {

            var response = oReq.responseText;
            if (response.indexOf("%failed%") != -1) {
                alert(response);
            } else {

                jsonArray = JSON.parse(response);

                for (let i = 0; i < jsonArray.length; i++) {

                    db.collection(collectionName).add(jsonArray[i])
                        .then((docRef) => {

                        })
                        .catch((error) => {
                            alert("Error adding document: " + error);
                        });
                }
            }
        }

    };
    oReq.send(oData);
}

/*
// Utility code to add field to collection or edit an existing field

    db.collection("programmeTexts").get().then(function (querySnapshot) {
        querySnapshot.forEach(async function (doc) {
            await db.collection("programmeTexts").doc(doc.id).set({ textContent: "undefined" }, { merge: true });
            // doc.data() is never undefined for query doc snapshots
            console.log(doc.id, " => ", doc.data());
        });
    });

// Utility code to change name of field in collection : devt and test awaited

  db.collection("programmeTexts").get().then(function (querySnapshot) {
    querySnapshot.forEach(async function (doc) {
      obj = { name: 'Bobo' } //key: value
      obj.newName = obj.name // on object create new key name. Assign old value to this
      delete obj.name
      await db.collection("programmeTexts").doc(doc.id).set({ textContent: "" }, { merge: true });
      // doc.data() is never undefined for query doc snapshots
      console.log(doc.id, " => ", doc.data());
    });
  });

*/

