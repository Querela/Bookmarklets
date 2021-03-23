(function() {

	function callback() {
		console.log("Bookmarklet script loaded.");
	}

	const element = document.createElement("script");
	element.src = "https://cdn.jsdelivr.net/gh/Querela/Bookmarklets@f6b13d9b23cc43f9538f4881e5bb1ae9306b1d0b/001_amazon_own_ebooks/bookmarklet.js";

	if (element.addEventListener) {
		element.addEventListener("load", callback, false);
	} else if (element.readyState) {
		element.onreadystatechange = callback;
	}

	document.body.appendChild(element);

})();
