Adult Video Aggregator

Description

This project is an adult video aggregator that collects and organizes videos based on categories, actors, and series. It features a fully functional server, a search system, video management, and a dynamic interface for browsing content efficiently. The system is designed with modular JSON-based data storage and runs on a Grok server for easy deployment.

Key Features:

Home Page: Displays all videos in order of most recent.

Search System: Allows searching by video title, actor, or category.

Unlock Feature: Unlocks the full website for unrestricted browsing.

Categories & Actors: Browse content by category or actor, sorted alphabetically or randomly.

Series & Lists: Organizes videos into series and custom lists.

Add New Content: Users can add new videos, actors, or series via an intuitive interface.

JSON-Based Storage: All data (videos, actors, categories, etc.) is stored in structured JSON files.

Grok Server: The system runs on a Grok server, providing a secure and dynamic URL for access.

QR Code Access: Quickly access the site on mobile devices using a QR code.

Requirements

To run this project, you will need:

Node.js (for running the server)

Grok (for tunneling the local server)

A modern web browser for accessing the interface

How to Run

Clone or download this repository.

Open a terminal and navigate to the project folder.

Start the server:

node server.js

A Grok link will be generated in the terminal. Open it in your browser.

Scan the provided QR code to access the site on your phone.

Usage

Once the server is running, users can:

Browse Videos: View the latest videos on the homepage.

Search Content: Search by keyword, category, or actor.

Unlock Content: Click the unlock button to reveal restricted content.

Browse by Category/Actor:

View categories and actors alphabetically or randomly.

Click on a category or actor to see all related videos.

Manage Content:

Add new videos with title, thumbnail, actors, categories, series, and protection settings.

Add new actors and series from their respective pages.

Use Series & Lists:

Organize videos into series or custom lists.

Project Structure

The project is organized into the following directories:

actors/ - Stores actor-related data.

categories/ - Contains category information.

add_video/ - Manages adding new videos.

data/ - Stores JSON files for videos, actors, and categories.

extras/ - Additional assets and helper functions.

list/ - Handles custom video lists.

main/ - Core UI and homepage functionalities.

series/ - Manages video series.

server/ - Server logic and Grok integration.

Copyright

(c) 2025 Francisco Duarte | Iron Taurus