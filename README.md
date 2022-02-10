# Canvas Syllabus Export Bookmarklet

This is a JavaScript bookmarklet that gathers information from a Canvas course 
into a single document. It gathers the course title, the text of the syllabus 
page, calendar events, assignment due dates, and assignment group weights.

## Setup

To set up this tool, all you need to do is create a new bookmark in your 
browser, then put the contents of `bookmarklet.min.js` into the URL field of 
the bookmark. The tool will be easier to use if you add this bookmark to your 
bookmarks bar in your browser.

## Use

To use the tool, you need to be signed in to Canvas and viewing your course 
site in Canvas. With any page on your Canvas site open, just click on your 
bookmarklet to generate a syllabus for that site.

## Issues

If you run into trouble with this tool, please open an issue in this repository 
with a description of the problem you're encountering.

## Minifying

If you're just using this tool, don't worry about this next bit, as it concerns 
developing and maintaining this code base.If you are modifying this tool, 
you'll want to minify `bookmarklet.js` to produce `bookmarklet.min.js`. After 
doing so, make sure that `bookmarklet.min.js` starts with `javascript:`, and 
that the self-calling function wrapper is itself wrapped in a `void()`. It 
needs `javascript:` at the start to work at all, and the `void()` wrapper to 
work in Firefox.