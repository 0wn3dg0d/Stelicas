# Stelicas

Stelicas (Steam Library Categories Scraper) - A tool designed to scrape your Steam library categories, retrieve comprehensive game details (including tags, release dates, reviews, and more), and export the data into a structured CSV format for easy organization and analysis.

![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic1.png)


## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Output](#output)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)


## Introduction

The way Steam stores user data has evolved over time. Early methods like `sharedconfig.vdf` and the local `leveldb` database are now obsolete. The modern Steam client uses a more direct and reliable system, storing library collections in a dedicated JSON file located within each user's `userdata` directory.

Stelicas is built specifically for this modern system. It directly accesses the official source file to accurately extract your library categories, ensuring you get the most up-to-date data possible.


## Features

- **Scrape Steam Library Categories**: Extract your custom Steam library categories directly from the current and correct data source file.
- **Retrieve Game Details**: Fetch comprehensive game details, including:
  - Game name and type
  - Tags
  - Release date
  - Review scores and counts
  - Publishers, developers, and franchises
  - And more
- **Export to CSV**: Save the scraped data in a structured CSV format for easy analysis and organization.
- **User-Friendly Interface**: A simple and intuitive interface to guide you through the process.
- **Reliable Steam Detection**: Automatically finds your Steam installation, with a manual selection option as a fallback.


## How It Works

Stelicas works by directly accessing the JSON file where the modern Steam client stores your collections data. The process is as follows:

1.  **Locates Steam**: The tool automatically finds your Steam installation folder (or allows you to specify it manually).
2.  **Reads Collections File**: It reads the `cloud-storage-namespace-1.json` file located in your `Steam/userdata/{Your_Steam3_ID}/config/cloudstorage/` directory.
3.  **Parses Data**: It parses this file to extract your custom library categories and the associated game IDs.
4.  **Enriches Data**: It then uses the Steam API to fetch detailed information for each game in your categorized library.
5.  **Exports**: Finally, it compiles all the data into a structured CSV file for your use.

### Important Note
During the data collection process, **the Steam client must be closed**. This is to prevent any conflicts or data corruption while Stelicas is reading your user files. The tool includes a built-in check and will not start if it detects that Steam is running.


## Installation

1.  **Download the latest release**: Go to the [Releases page](https://github.com/0wn3dg0d/Stelicas/releases) and download the installer for your operating system (e.g., `Stelicas-Setup-1.0.3.exe`).
2.  **Run the installer**: Install the application.

Alternatively, you can run from source:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/0wn3dg0d/stelicas.git
    cd stelicas
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Application**:
    ```bash
    npm start
    ```


## Usage

1.  **Launch Stelicas**: Open the application. Stelicas will attempt to find your Steam folder automatically. If it fails, you will be prompted to select the folder manually.

2.  **Select Your Account ID (Steam3 ID)**:
    - The application will list all user profiles found in your Steam `userdata` directory.
    - Click on your ID to automatically fill in the field. This is the numeric part of your Steam3 ID (`U:1:XXXXXXX`).

    ![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic5.png)

3.  **Select Language, Country Currency, and Supported Language**:
    - **Language**: Choose the language for game details (descriptions, titles, etc.).
    - **Country Currency**: It is recommended to leave this as **US Dollar** to ensure maximum compatibility when fetching game data.
    - **Supported Language**: This option checks for specific language support (interface, audio, subtitles) in your games.

    ![Stelicas Interface](https://github.com/0wn3dg0d/Stelicas/blob/main/previews/Interface-pic2.png)

4.  **Start the Process**:
    - Click the "Start" button.
    - A progress bar will show the status of the process.

5.  **View the Output**:
    - Once complete, the data will be saved in the `output` folder inside the application's directory.


## Output

The output consists of two CSV files:

1.  **`id_categories.csv`**: Contains a direct mapping of game IDs to their assigned categories.
2.  **`final_data.csv`**: The full dataset with comprehensive details for each categorized game.

*(The rest of the "Output" section remains the same as before)*

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
- **Steam-Link**: A link to the game's Steam Community page (not the Store page). This is intentional because some games may have been removed from the Steam Store but are still accessible via their Community pages. Using the Community link ensures that you can access the page for any game, even if it is no longer available in the Store.
- **Pic**: A link to the game`s header image.


## FAQ

### Why does Stelicas require the Steam client to be closed?
Stelicas reads user configuration files directly from the Steam directory. To prevent any file access conflicts or potential data corruption while the application is reading this data, the Steam client must be closed. The tool has a built-in check that prevents it from running if `Steam.exe` is active.

### Will Stelicas work if there are multiple Steam accounts on the computer?
Yes. The application now automatically detects all user profiles in the `Steam/userdata` folder and allows you to select the correct one from a list in the UI.

### Why are games without categories not included in the output?
Stelicas is designed to extract and organize games based on the categories you have explicitly assigned. If a game is not in any collection (other than default ones like "Uncategorized"), it will not be included in the output. This is a core function of the tool, focusing on user-organized titles.

### Why do changes to game categories not immediately appear in the output?
Category changes you make in the Steam client are saved to the `cloud-storage-namespace-1.json` file. Steam might not write these changes to the file instantly, especially if the client is busy or during cloud sync operations. If your latest changes don't appear, please try restarting the Steam client completely and then running Stelicas again. This usually forces Steam to save the latest state to the file.


## Contributing

If you have any suggestions, bug reports, or feature requests, please open an issue or submit a pull request.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
