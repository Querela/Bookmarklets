(async function() {
	// locale specific strings
	const STR_BOOKS_ALL_CAT = "Bücher--Alle";
	const STR_BOOKS_BUY_CAT = "Bücher--Käufe";
	const STR_BOOKS_SAMPLES_CAT = "Bücher--Beispiele";
	const STR_BOOKS_BORROW_CAT = "Bücher--Ausgeliehen";
	const STR_BOOKS_KU_CAT = "Kindle Unlimited--Alle"; // can contain magazines
	const STR_BTN_PREV = "Voriges anzeigen";
	const STR_BTN_MORE = "Mehr anzeigen";
	const STR_EMAG = "e-Magazin";

	// TODO: check we are on page: https://www.amazon.de/hz/mycd/myx?ref_=nav_AccountFlyout_myk

	// All:     https://www.amazon.de/hz/mycd/myx?ref_=nav_AccountFlyout_myk
	// Samples: https://www.amazon.de/hz/mycd/myx#/home/content/booksSamples/dateDsc/
	// Buy:     https://www.amazon.de/hz/mycd/myx#/home/content/booksPurchases/dateDsc/
	// Borrow:  https://www.amazon.de/hz/mycd/myx#/home/content/booksBorrows/dateDsc/
	// KU only: https://www.amazon.de/hz/mycd/myx#/home/content/kuAll/dateDsc/

	// ----------------------------------------------------------------------
	// extend promises for delays

	// ------------------------------------
	// https://stackoverflow.com/a/39538518
	function delay(t, v) {
		return new Promise(function(resolve) { 
			setTimeout(resolve.bind(null, v), t)
		});
	}

	Promise.prototype.delay = function(t) {
		return this.then(function(v) {
			return delay(t, v);
		});
	}

	// ------------------------------------
	// https://stackoverflow.com/a/30506051
	// https://stackoverflow.com/a/30507964
	function waitFor(cond, timeout, value) {
		return new Promise(function (resolve, reject) {
			(function waitForCondition(){
				if (cond()) {
					return resolve(value);
				}
				setTimeout(waitForCondition, timeout);
			})();
		});
	}

	function waitForTimed(cond, delay, timeout, value) {
		var start = Date.now();
		return new Promise(function (resolve, reject) {
			(function waitForCondition(){
				if (cond()) {
					return resolve(value);
				} else if (timeout && (Date.now() - start) >= timeout) {
					reject(new Error("timeout"));
				}
				setTimeout(waitForCondition, delay);
			})();
		});
	}

	Promise.prototype.waitFor = function(c, t) {
		return this.then(function(v) {
			return waitFor(c, t, v);
		});
	}

	Promise.prototype.waitForTimed = function(c, d, t) {
		return this.then(function(v) {
			return waitForTimed(c, d, t, v);
		});
	}

	// ----------------------------------------------------------------------
	// pagination helper

	function parse_table_counts() {
		var table_desc = "";
		if (window.document.location.href.indexOf("https://www.amazon.de/hz/mycd/myx#/home/content/ku") !== -1
			|| window.document.location.href.indexOf("https://www.amazon.de/hz/mycd/myx#/home/content/booksBorrows/") !== -1) {
			table_desc = document.querySelector('[ng-bind-html-unsafe="getString(\'myx_content_count_less_category\',{selectedSubCategory: selectedSubCategory, selectedCategory: selectedCategory, totalItems: totalItems})"]').textContent;
		} else if (window.document.location.href.indexOf("https://www.amazon.de/hz/mycd/myx#/home/content/books") !== -1) {
			table_desc = document.querySelector('[ng-bind-html-unsafe="getString(\'myx_content_count_category\',{fromItems: fromItems, toItems: toItems, totalItems: totalItems, selectedCategory: selectedCategory, selectedSubCategory: selectedSubCategory})"]').textContent;
		} else {
			throw Error("Unsupported page?!");
		}

		var start = end = total = 0;
		if (table_desc.indexOf(STR_BOOKS_ALL_CAT) !== -1
			|| table_desc.indexOf(STR_BOOKS_BUY_CAT) !== -1
			|| table_desc.indexOf(STR_BOOKS_SAMPLES_CAT) !== -1) {
			let parts = table_desc.trim().split(" ");
			start = Number.parseInt(parts[0]);
			end = Number.parseInt(parts[2]);
			total = Number.parseInt(parts[4]);	
		} else if (table_desc.indexOf(STR_BOOKS_BORROW_CAT) !== -1
			|| table_desc.indexOf(STR_BOOKS_KU_CAT) !== -1) {
			console.debug("Borrowed books page");
			start = end = total = Number.parseInt(table_desc.split("(")[1].split(")")[0]);
		} else {
			console.debug("Unknown table count format?", table_desc);
		}
		// console.debug("Table counts:", start, end, total);  // DEBUG
		return [start, end, total];
	}

	function check_table_has_all() {
		let parts = parse_table_counts();
		let end = parts[1], total = parts[2];
		return (end === total);
	}

	function check_table_page_loaded() {
		let parts = parse_table_counts();
		let start = parts[0], end = parts[1], total = parts[2];
		console.debug("wait_loaded: " + start + "-" + end + " / " + total)

		if (end === total) {
			console.debug("wait_loaded: Reached end.")
			return true;
		}
		if (end - start + 1 === 200) {
			console.debug("wait_loaded: Reached current pagination limit.")
			return true;
		}
		return false;
	}

	// ----------------------------------------------------------------------
	// navigation?

	async function scroll_to_bottom() {
		let next_button_enabled = document.querySelector('[ng-show="paginationThresholdReached"]').attributes["style"].textContent.indexOf("display: none") === -1;
		if (!next_button_enabled) {
			let bottom = document.getElementById("navBackToTop");
			bottom.scrollIntoView();
		}
	}

	async function goto_next_page() {
		let next_button = document.getElementById("contentTable_showMore_myx ");
		let next_button_text = next_button.children[0].children[1].children[0].textContent;
		let is_previous = next_button_text.indexOf(STR_BTN_PREV) !== -1;
		let is_next = next_button_text.indexOf(STR_BTN_MORE) !== -1;

		if (is_previous) {
			// remove previous page button
			next_button.remove();

			next_button = document.getElementById("contentTable_showMore_myx ");
			next_button_text = next_button.children[0].children[1].children[0].textContent;
			is_next = next_button_text.indexOf(STR_BTN_MORE) !== -1;
		}

		if (!is_next) {
			throw Error("No is_next button???");
		}

		next_button.click();
	}

	// ----------------------------------------------------------------------
	// meta parsing helpers

	function parse_row_entry(row) {
		let is_leseprobe = false;
		let leseprobe_ele = row.querySelector('[on="ownershipType"]');
		if (leseprobe_ele !== null) {
			// check just for magazines
			is_leseprobe = leseprobe_ele.textContent.indexOf("Leseprobe") !== -1;
		}
		let is_ku = row.querySelector('[ng-switch-when="KULoan"]') !== null;
		let is_gelesen = row.querySelector(".contentBadge_myx.readBadgeText").parentElement.parentElement.parentElement.parentElement.attributes["style"] === undefined;
		let has_update = row.querySelector(".contentBadge_myx.updateAvailableBadge") !== null;

		let title = row.querySelector('[bo-id="\'title\'+tab.index"]').textContent;
		let author = row.querySelector('[bo-id="\'author\'+tab.index"]').textContent;
		let date = row.querySelector('[bo-id="\'date\'+tab.index"]').textContent;

		let entry = {
			title: title,
			author: author,
			date: date,
			is_ku: is_ku,
			is_leseprobe: is_leseprobe,
			is_gelesen: is_gelesen,
			has_update: has_update,
		};

		return entry;
	}

	async function open_book_modal(row) {
		let row_btn = row.querySelector(".listViewIconPosition_myx.myx-popover-trigger");
		row_btn.click();
	}

	function is_book_modal_open(row) {
		let row_modal = row.querySelector(".contentDetailPopover_myx");
		return row_modal.className.indexOf("open_myx") !== -1;
	}

	async function parse_row_modal_content(row, entry) {
		function extract_image(row, entry) {
			entry["img"] = row.querySelector(".contentImage_myx img").attributes["src"].textContent;
		}

		try {
			extract_image(row, entry);
		} catch (e) {
			// console.debug("error extracting image? Retry", entry, e);  // DEBUG

			await (new Promise(resolve => resolve()))
				.waitForTimed(() => {
					try {
						extract_image(row, entry);
						// console.debug("Sucessful", entry);  // DEBUG
						return true;
					} catch (e) {
						return false;
					}
				}, 250, MAX_DELAY_IMAGE_RETRY)
				.catch(err => console.warn("Error extracting image:", entry));
		}

		try {
			entry["url"] = row.querySelector('a[ng-attr-id="{{\'detailsPageUrl\' + index}}"]').attributes["href"].textContent;
		} catch (e) {
			console.debug("error extracting image", entry, e);
		}

		try {
			if (!entry.is_ku) {
				let book_price = row.querySelector('[ng-attr-id="{{\'orderAmount\' + index}}"]');
				if (book_price) {
					book_price = book_price.textContent.trim();
					entry["price"] = book_price.split(": ")[1];
				}
			}
		} catch (e) {
			console.debug("error extracting price", entry, e);
		}

		try {
			if (row.querySelector("#contentAction_returnLoan_myx").textContent.trim().indexOf(STR_EMAG) !== -1) {
				entry["is_magazine"] = true;
			}
		} catch (e) {
			console.debug("error checking magazine", entry, e);
		}

		try {
			let row_modal = row.querySelector(".contentDetailPopover_myx");
			let row_modal_dl = row_modal.querySelector("#contentAction_download_myx"); // !== null ?
			entry["downloadable"] = row_modal_dl !== null;
			if (row_modal_dl !== null) {
				// if download option hidden (then probably not working (opens error page!))
				entry["downloadable"] = row_modal_dl.parentElement.parentElement.parentElement.parentElement.style.display !== "none";
			}
		} catch (e) {
			console.debug("error checking if downloadable", entry, e);
		}
	}

	// ----------------------------------------------------------------------
	// download simulation helpers

	async function open_download_modal(row) {
		let row_modal = row.querySelector(".contentDetailPopover_myx");
		let row_modal_dl = row_modal.querySelector("#contentAction_download_myx");

		if (row_modal_dl === null
			|| row_modal_dl.parentElement.parentElement.parentElement.parentElement.style.display === "none") {
			throw Error("Entry is not for download!");
		}

		row_modal_dl.click();
	}

	function gather_download_devices() {
		let dl_modal = document.getElementById("ui_dialog_myx_popover");
		// only once - list devices (active one should be selected)
		let dl_device = dl_modal.querySelector(".deviceDropdown_myx").textContent;
		let dl_devices = [];
		dl_modal.querySelectorAll(".myx-dropdown.dropdown_myx ul li").forEach(e => { dl_devices.push({ active: e.className.indexOf("myx-active") !== -1, name: e.textContent.trim() }); });
		return dl_devices;
	}

	async function click_download_book() {
		let dl_btn_download = document.getElementById("dialogButton_ok_myx ")
		dl_btn_download.click();
	}

	async function close_download_modal() {
		// close dialog
		let backdrop = document.querySelector(".dialogBackdrop_myx");
		backdrop.click();
	}

	// ----------------------------------------------------------------------

	async function sideload_book_page_for_content(uri) {
		const element = document.createElement("iframe");
		element.src = uri;
		element.style.display = "none";

		const promise = new Promise(function(resolve) {
			element.addEventListener("load", function () {
				console.debug("Loaded iframe: " + uri);
				resolve(this.contentWindow.document);
			});

			document.body.appendChild(element);
		});

		const content = await promise
			.delay(50)
			.then(doc => {
				let frame_inner = doc.querySelector("#bookDesc_iframe");
				let content = frame_inner.contentDocument.getElementById("iframeContent");
				content.innerHTML = content.innerHTML.replaceAll("<br>", "<br>\n");
				return content.textContent;
			});

		document.body.removeChild(element);
		// TODO: or use .id and remove older iframes?

		return content;
	}


	// ----------------------------------------------------------------------
	// create download dialog for object

	function download(obj, filename) {
		const blob = new Blob([JSON.stringify(obj, null, 2)], {type : "application/json"});
		const uri = window.URL.createObjectURL(blob);

		const element = document.createElement("a");
		element.href = uri;
		element.download = filename;
		element.style.display = "none";
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);

		// TDODO: better handling of disposal?
		window.URL.revokeObjectURL(uri)
	}

	// ----------------------------------------------------------------------
	// meta data scraping

	const MAX_DELAY_IMAGE_RETRY = 5000;
	async function extract_from_table() {
		const rows = document.querySelectorAll(".contentTableList_myx .contentTableListRow_myx li .myx-row.listItem_myx");
		var data = [];

		for (var i = 0; i < rows.length; i++) {
			let row = rows[i];
			let entry = parse_row_entry(row);
			data.push(entry);

			await open_book_modal(row)
				.delay(20)
				.waitForTimed(is_book_modal_open.bind(null, row), 50, 1000)
				.then(async () => {
					await parse_row_modal_content(row, entry);
					// console.debug(i, entry);  // DEBUG
				})
				.catch(err => console.debug("error with book modal?", err));
		}

		return data;
	}

	async function scrape_and_download_meta_data() {
		var data = [];

		page_nr = 0;
		while ( true ) {
			console.log("Process page " + page_nr + " ...");

			// load all entries on page
			await scroll_to_bottom()
				.waitFor(check_table_page_loaded, 250);

			// extract data
			let data_page = await extract_from_table();
			data = data.concat(data_page);

			// check if done?
			if ( check_table_has_all() ) {
				console.debug("We are finished!")
				break;
			}
			// load more/next page
			await goto_next_page()
				.delay(250);
			page_nr++;
		}

		// wrap data for download
		download(data, "data.json");
	}

	// ----------------------------------------------------------------------
	// ebook download

	async function process_table_rows() {
		const rows = document.querySelectorAll(".contentTableList_myx .contentTableListRow_myx li .myx-row.listItem_myx");

		for (var i = 0; i < rows.length; i++) {
			let row = rows[i];

			await open_book_modal(row)
				.delay(25)
				.waitForTimed(is_book_modal_open.bind(null, row), 50, 1000);
			await open_download_modal(row)
				.delay(25)
				.then(async () => {
					await click_download_book()
						.delay(1000);
					await close_download_modal()
						.delay(10);
				})
				.catch(err => {
					let entry = parse_row_entry(row);
					console.debug("Skip entry: " + entry.title + " - " + entry.author + ": " + err);
				});
		}
	}

	async function click_all_book_download_links() {
		// load all entries on page
		await scroll_to_bottom()
			.waitFor(check_table_page_loaded, 250);

		// click all downloads
		await process_table_rows();
	}

	// ----------------------------------------------------------------------

	function add_menu() {
		const html = `
			<section id="ek_amazon_utils_sidebar" style="
				z-index: 999; position: fixed; top: 15px; right: 15px;
				background-color: aliceblue; opacity: 95%;
				margin: 5px; padding: 10px;
				border-block-color: black; border-style: dashed; border-width: 2px; border-radius: 5px;
				max-width: 200px;
			">
			  <h4>Utils</h4>
			  <hr>
			  <a onClick="window.location.reload();">Reload</a><br>
			  <a id="ek_amazon_utils_scrape_meta">Scrape Meta</a><br>
			  <a id="ek_amazon_utils_queue_downloads">Queue Downloads</a>
			  <hr>
			  <div id="ek_amazon_utils_progress"></div>
			</section>
		`;
		const element = document.createElement("section");
		element.innerHTML = html;
		document.body.appendChild(element);

		document.getElementById("ek_amazon_utils_scrape_meta")
			.addEventListener("click", async (event) => {
				await scrape_and_download_meta_data();
			}, false);
		document.getElementById("ek_amazon_utils_queue_downloads")
			.addEventListener("click", async (event) => {
				await click_all_book_download_links();
			}, false);
	}

	// ----------------------------------------------------------------------

	if (typeof window.ek_amazon_utils !== "undefined") {
		console.warn("Already installed amazon utils!");
		return;
	}

	//await scrape_and_download_meta_data();
	//await click_all_book_download_links();

	add_menu();

	window.ek_amazon_utils = true;
})();
