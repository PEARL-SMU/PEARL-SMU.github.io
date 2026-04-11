# PEARL Website Documentation

This repository contains the front-end source code for the lab's website. It is a lightweight, static, single-page application built with plain HTML, CSS, and JavaScript that dynamically loads all of its content from JSON files.

## 📁 Project Structure

* `index.html`: The main page structure containing sections for Home, Leadership, Team, Publications, Grants, and News.
* `styles.css`: Contains the "PEARL Lab Dark Theme" styling, including responsive layouts, CSS variables for theming, and scroll animations.
* `script.js`: The core logic that fetches data concurrently, populates the HTML dynamically, handles publication filtering, and triggers intersection observers for fade-in animations.
* `data/`: This directory must contain the six JSON data files that power the site content: `lab.json`, `themes.json`, `people.json`, `publications.json`, `grants.json`, and `news.json`.

## 🚀 Setup & Installation

Because this site uses the JavaScript `fetch()` API to load local JSON files, it **cannot** be run simply by double-clicking the `index.html` file in your browser. You must serve it over a local HTTP server.

1. Clone this repository.
2. Ensure your JSON files are located in a folder named `data/` at the root of your project.
3. Start a local server in the project directory:
   * **Python 3:** Run `python -m http.server 8000`
   * **Node.js:** Run `npx serve -p 8000 .`
4. Open `http://localhost:8000` in your web browser.

## 📝 Managing Content (JSON Data)

All text, images, and links are managed via the JSON files in the `data/` directory. You do not need to touch the HTML or JavaScript to add new members, papers, grants, or news.

### 1. The Team (`people.json`)
The website automatically categorizes and orders team members based on their `role`.
* **Principal Investigator:** The script specifically searches for the *first* person with the exact role `"Principal Investigator"` and constructs a dedicated "Leadership" section for them.
* **Other Roles:** To appear in the main "People" grid, a team member must have one of these exact, case-sensitive roles:
  * `Postdoc`
  * `Research Engineer`
  * `PhD Student`
  * `Masters Student`
  * `Visiting Researcher`
  * `Alumni`
* **Links:** The script automatically formats buttons with specific icons for the following predefined keys: `website`, `scholar`, `twitter`, `github`, and `email`.

### 2. Publications (`publications.json`)
* **Tags & Filtering:** The publication filter buttons at the top of the section are generated dynamically based on the unique `tags` you assign to each paper in the JSON array.
* **Highlights:** Set `"highlight": true` on a publication to give it a "Featured" badge and a prominent gold border.
* **Self-Highlighting:** If a string in the `authors` array exactly matches the Principal Investigator's name, that author's name will be automatically highlighted in the UI.

### 3. Grants (`grants.json`)
This section displays the lab's current and past funding.
* **Data Fields:** Each grant object displays the `title`, `amount`, `role` (e.g., PI, Co-PI), `funder`, and `period`.
* **Optional Descriptions:** You can include an optional `description` string to provide a brief summary of the project. If omitted, the grant card will simply condense its layout to fit the available metadata.

### 4. News Updates (`news.json`)
News items are visually styled based on their category. You must use one of the following exact categories to trigger the correct background and text colors:
* `Award` (Yellow)
* `Paper` (Blue)
* `Talk` (Green)
* `Join` (Purple)
* `Grant` (Red)

### 5. Lab Info & Themes (`lab.json` & `themes.json`)
* `lab.json`: Controls the site-wide metadata, the hero headline, contact info, and the top navigation bar name.
* `themes.json`: Populates the grid of "Our Research" theme cards displayed in the hero section.

## 🎨 Customization

If you need to rebrand the lab's primary colors or fonts, open `styles.css` and modify the `:root` variables at the top of the file.
* `--accent` and `--gold` control the primary highlight colors.
* `--paper`, `--paper2`, and `--paper3` control the dark navy background layers.