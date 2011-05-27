// adds notification bar style
function addStyle() {
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(
            "#utanote { display: block; position: fixed; left: 0; top: 0; width: 100%; padding: 5px; height: 20px; background: -webkit-linear-gradient(#62c388, #00853F); z-index: 19999 }" +
            "#utanote button { float: right; margin: 0 10px 0 0;} " +
            "#utanote span { color: white;float: left; font-weight:bold; font-family: sans-serif } " +
            "#utanote div { background: url(" + chrome.extension.getURL("icon.png") + ") center center no-repeat; float: left; width: 36px; height:20px;} "
            ));
    document.head ? document.head.appendChild(style) : document.body.appendChild(style)
}

// creates notification bar
function createNotification() {
    var popup = document.getElementById("utanote");
    if (popup == null) {
        popup = document.createElement("div");
        popup.setAttribute("id", "utanote");
        popup.innerHTML = "<div></div><span id=\"utamsg\"></span><button onclick=\"document.getElementById('utanote').style.display='none';\">Close</button>";

        document.body.insertBefore(popup, document.body.firstChild);
    }

    return popup;
}

// displays notification message
function displayNotification(msg) {
    var popup = document.getElementById("utanote");
    if (popup == null) {
        popup = createNotification();
    }
    if (popup.style.display == "none") {
        popup.style.display = "block";
    }

    document.getElementById("utamsg").innerHTML = msg;
}

// listen to events coming from plugin
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.greeting == "utaNotification") {
        displayNotification(request.msg);
    } else if (request.greeting == "utaHide") {
        window.setTimeout(function() {
            document.getElementById("utanote").style.display = "none";
        }, 10000);
    }
});

// add notification style
addStyle();
