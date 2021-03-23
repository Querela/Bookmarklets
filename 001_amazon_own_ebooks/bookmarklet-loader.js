(function() {

	const SCRIPT_PATH = "@da2759de8da77bf471cdd5c0a2e803d0164cef7d/001_amazon_own_ebooks/bookmarklet.js";

	function callback() {
		console.log("Bookmarklet script loaded.");
	}

	const element = document.createElement("script");
	element.src = "https://cdn.jsdelivr.net/gh/Querela/Bookmarklets" + SCRIPT_PATH;

	if (element.addEventListener) {
		element.addEventListener("load", callback, false);
	} else if (element.readyState) {
		element.onreadystatechange = callback;
	}

	document.body.appendChild(element);

})();
