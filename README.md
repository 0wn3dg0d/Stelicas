# Stelicas

Stelicas (Steam Library Categories Scraper) - A tool designed to scrape your Steam library categories, retrieve comprehensive game details (including tags, release dates, reviews, and more), and export the data into a structured CSV format for easy organization and analysis.

![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic1.png)


## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Output](#output)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)


## Introduction

In the past, Steam library categories could be easily extracted from the `sharedconfig.vdf` file. However, with recent updates to the Steam client, this file has become outdated and no longer reflects the current state of your library. The most up-to-date information is now stored in the `leveldb` database, which is part of the Steam client`s local storage. Stelicas is designed to access this database, extract your library categories, and enrich the data with detailed game information from the Steam API.


## Features

- **Scrape Steam Library Categories**: Extract your custom Steam library categories directly from the local database.
- **Retrieve Game Details**: Fetch comprehensive game details, including:
  - Game name
  - Game type
  - Tags
  - Release date
  - Review scores and counts
  - Publishers, developers and franchises
  - And more
- **Export to CSV**: Save the scraped data in a structured CSV format for easy analysis and organization.
- **User-Friendly Interface**: A simple and intuitive interface to guide you through the process.


## How It Works

Stelicas works by accessing the `leveldb` database located in the Steam client`s local storage. It reads the database entries to extract your custom library categories and the associated game IDs. Then, it uses the Steam API to fetch detailed information about each game. Finally, it compiles all the data into a CSV file for easy access and analysis.


### Important Note
During the data collection process, **the Steam client must be closed**. Stelicas includes a built-in check to ensure that Steam is not running before proceeding. If Steam is detected as running, the tool will refuse to collect data to prevent conflicts.


## Prerequisites

Before using Stelicas, ensure you have the following installed on your system:

- **Node.js** (v16 or higher)
- **npm** (usually comes with Node.js)
- **Steam Client** (installed and logged in)


## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/0wn3dg0d/stelicas.git
   cd stelicas
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Application**:
   ```bash
   npm start
   ```


## Usage

1. **Launch Stelicas**:
   After running `npm start`, the Stelicas application window will open.

2. **Enter Your Account ID (Steam 3 ID)**:
   - Your Steam3 ID is a unique identifier for your Steam account. It is usually in the format `U:1:XXXXXXX` (Use the `XXXXXXX` part).
   - This ID corresponds to the folder name in your Steam `userdata` directory, which is typically located at:
     ```bash
     {Steam folder}\userdata
     ```
     Each folder in this directory represents a different Steam account, and the folder name is the `XXXXXXX` part of your Steam3 ID.
   - If you don`t know your Steam3 ID, Stelicas can automatically detect it from your Steam installation. Click on any of the detected IDs to populate the field.

       ![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic5.png)

3. **Select Language, Country Currency, and Supported Language**:
   - **Language**: Choose the language in which you want to retrieve game details (e.g., descriptions, titles). If a game has a translation for the selected language, the data will be displayed in that language.
   - **Country Currency**: Select the country currency. It is recommended to leave this as **US Dollar**, as games in other currencies may not be available in certain regions, which could result in missing data.
   - **Supported Language**: This option indicates whether the game supports the selected language. The result is displayed in the format `{true;false;true}` and etc, where:
     - The first value indicates if the game has **interface translation**.
     - The second value indicates if the game has **full audio translation**.
     - The third value indicates if the game has **subtitles translation**.
     - If the result is `{TRUE}`, it means the game fully supports the selected language (all values are `true`).
     - If the result is `{FALSE}`, it means the game does not support the selected language at all (all values are `false`).

       ![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic2.png)

4. **Start the Process**:
   - Click the "Start" button to begin scraping your library categories and fetching game details.
   - A progress bar will show the status of the process.

5. **View the Output**:
   - Once the process is complete, the data will be saved in the `output` folder.


## Output

The output consists of two CSV files:

1. **`id_categories.csv`**: This file contains a mapping of game IDs to their associated categories. It is useful if you only need the category information without additional game details.

   Example of `id_categories.csv`:
   ```csv
   game_id	categories
   13560	Splinter Cell Series
   206440	Backlog
   ```

2. **`final_data.csv`**: This file contains the full dataset, including game details such as name, tags, release date, reviews, and more. Below is a detailed description of the columns in this file.

### Columns in `final_data.csv`

- **game_id**: The unique Steam ID of the game.
- **name**: The name of the game.
- **categories**: The custom categories you have assigned to the game in your Steam library.
- **type**: The type of the game (e.g., game, DLC, etc.).
- **tags**: The tags associated with the game.
- **release_date**: The release date of the game.
- **review_percentage**: The percentage of positive reviews.
- **review_count**: The total number of reviews.
- **is_free**: Indicates whether the game is free.
- **is_early_access**: Indicates whether the game is in early access.
- **publishers**: The publishers of the game.
- **developers**: The developers of the game.
- **franchises**: The franchises associated with the game.
- **short_description**: A short description of the game.
- **supported_language**: Indicates whether the game supports your selected language.
- **Steam-Link**: A link to the game`s Steam store page.
- **Pic**: A link to the game`s header image.

### Example Output

| game_id | name           | categories | type | tags               | release_date | review_percentage | review_count | is_free | is_early_access | publishers | developers | franchises | short_description | supported_language | Steam-Link                          | Pic                                   |
|---------|----------------|------------|------|--------------------|--------------|-------------------|--------------|---------|-----------------|------------|------------|------------|-------------------|--------------------|-------------------------------------|---------------------------------------|
| 730     | Counter-Strike | FPS;Shooter| 0 | Action;Multiplayer | 21.08.2012   | 88                | 1200000      | false   | false           | Valve      | Valve      | Counter-Strike| "The classic..." | {TRUE}             | https://steamcommunity.com/app/730  | https://steamcdn-a.akamaihd.net/...   |


## FAQ

### Why does Stelicas require the Steam client to be closed?
The Steam client locks the `leveldb` database while it is running. To access the database and extract your library categories, the Steam client must be closed. Stelicas includes a built-in check to ensure that Steam is not running before proceeding.

### Will Stelicas work if there are multiple Steam accounts on the computer?
Currently, this scenario has not been tested. In theory, Stelicas should work with multiple accounts, as it relies on the Steam3 ID to identify the correct user data. However, since this has not been verified in practice, I cannot guarantee its functionality in such cases. If you have multiple accounts, Ш recommend testing and providing feedback.

### Why are games without categories not included in the output?
Stelicas is designed to extract and organize games based on the categories you have assigned in your Steam library. If a game is not assigned to any category, it will not appear in the output. This is because the tool focuses on categorizing and analyzing games that have been explicitly organized by the user. If you want to include uncategorized games, you can manually assign them to a category in your Steam library and rerun the tool.

### Why do changes to game categories not immediately appear in the output?
Steam's `leveldb` database, which Stelicas uses to extract category information, may not immediately reflect changes made to your library categories. This can happen for several reasons:

1. **Database Caching**: Steam may cache category data to optimize performance, meaning changes might not be written to the database immediately.
2. **Delayed Synchronization**: Steam could delay syncing changes to the local database, especially if the client is under heavy load or if there are network-related delays.
3. **Historical Data**: The `leveldb` database might retain historical or redundant data for a certain period, even after categories are removed or modified.

While this behavior can be frustrating, it is important to note that the `leveldb` database is still the most up-to-date and reliable source for category information compared to the outdated `sharedconfig.vdf` file. If changes do not appear immediately, try restarting Steam or waiting a few minutes before running Stelicas again.

If the issue persists, it may be related to how Steam internally manages its database, and there is little that can be done from the tool's side.


## Future Improvements

Stelicas already provides a comprehensive set of features for extracting and organizing Steam library categories and game details. However, the Steam API offers even more data that could be integrated. Below are some potential data points that could be extracted:

### Additional Game Details
- **Full Descriptions**.

### Pricing and Discounts
- **Best Purchase Option**: Details about the best purchase option, including:
  - Package ID and name.
  - Temporary free status and end dates.
  - Original and discounted prices.
  - Discount percentages and end dates.
  - Gift purchase availability.
  - Hidden discounts and package contents.
- **Active Discounts**: Information about active discounts, including start and end dates.

### Platforms and Compatibility
- **Platform Support**: Detailed platform compatibility information, including:
  - Windows, Mac, and Linux support.
  - Steam Deck compatibility.
  - VR support (e.g., Oculus Rift, HTC Vive, Valve Index, Windows MR).
- **Release Dates by Platform**: Platform-specific release dates for games.

### Age Ratings and Content Descriptors
- **Age Ratings**: Detailed age rating information, including:
  - Rating type and value.
  - Content descriptors.
  - Required age and age gate usage.


## Contributing

If you have any suggestions, bug reports, or feature requests, please open an issue or submit a pull request.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
