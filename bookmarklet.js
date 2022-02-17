void (function () {
  function paginatedFetch(url, previousResponse = []) {
    return fetch(url)
      .then((response) => {
        return response.json().then((json) => ({
          // return both response values and link header
          values: json,
          link: response.headers.get("link"),
        }));
      })
      .then((responseWithLinks) => {
        let finalResponse = [...previousResponse, ...responseWithLinks.values];
        // link header has multiple comma-separated links in this format:
        // <linkUrl>; rel="linkType"
        // since only one is needed, it's easier to extract with regex than a split
        let parserExp = /<([\w:\/=?&.]+?)>; rel="next"/;
        let nextLinkMatch = parserExp.exec(responseWithLinks.link);
        if (nextLinkMatch) {
          // if there's a next link, recurse this function
          return paginatedFetch(nextLinkMatch[1], finalResponse);
        } else {
          // otherwise return the responses gathered
          return finalResponse;
        }
      });
  }
  class Event {
    constructor(title, description, start, end) {
      // Define an event object to be used by assignments and calendar entries
      this.title = title;
      this.description = description;
      this.start = start;
      this.end = end;
    }
    get dateString() {
      // set some standard options for displaying date/time info
      let dateOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return this.start
        ? this.start.toLocaleDateString("en-US", dateOptions)
        : "";
    }
    get timeString() {
      let timeOptions = {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      };
      if (this.start & this.end) {
        return `${this.start.toLocaleTimeString(
          "en-US",
          timeOptions
        )} to ${this.end.toLocaleTimeString("en-US", timeOptions)}`;
      } else {
        return this.start
          ? this.start.toLocaleTimeString("en-US", timeOptions)
          : "";
      }
    }
  }

  // get course ID from url
  const courseIdMatch = /courses\/(\d+)/;
  const sisIdMatch = /courses\/(sis_course_id:\d+)/;
  let match = courseIdMatch.exec(window.location.pathname);
  let sisMatch = sisIdMatch.exec(window.location.pathname);
  if (match) {
    // if the URL has a course ID, use it to generate a syllabus
    let courseId = match[1];
    let includeDescription = window.confirm(
      'Do you want to include descriptions for assignments and calendar events? (Choose "OK" for yes and "Cancel" for no)'
    );

    // fetch course info
    const fetchCourse = fetch(
      `/api/v1/courses/${courseId}?include[]=syllabus_body`
    ).then((res) => res.json());

    // fetch parse calendar info and parse into Event objects
    const fetchCalendar = paginatedFetch(
      `/api/v1/calendar_events?context_codes[]=course_${courseId}&all_events=true`
    ).then((res) => {
      let events = [];
      res.forEach((calendarEvent) => {
        let event = new Event(
          calendarEvent.title,
          includeDescription ? calendarEvent.description : "",
          new Date(calendarEvent.start_at),
          new Date(calendarEvent.end_at)
        );
        events.push(event);
      });
      return events;
    });

    // fetch assignments and parse into Event objects
    const fetchAssignments = paginatedFetch(
      `/api/v1/courses/${courseId}/assignments`
    ).then((res) => {
      let events = [];
      res.forEach((assignment) => {
        let event = new Event(
          assignment.name,
          includeDescription && assignment.description
            ? assignment.description
            : "",
          assignment.due_at ? new Date(assignment.due_at) : null,
          null
        );
        events.push(event);
      });
      return events;
    });

    // fetch assignment groups
    const fetchAssignmentGroups = paginatedFetch(
      `/api/v1/courses/${courseId}/assignment_groups`
    );

    // When all info is collected...
    Promise.all([
      fetchCourse,
      fetchCalendar,
      fetchAssignments,
      fetchAssignmentGroups,
    ]).then(([course, calendarEvents, assignmentEvents, assignmentGroups]) => {
      // merge and sort calendar entries and assignments
      let events = [...calendarEvents, ...assignmentEvents];
      events.sort((a, b) => a.start - b.start);

      // create the html for the syllabus output
      let content = `<style>
          table { border-spacing:0; }
          th { background-color: #EEE; }
          td { border: 1px solid; }
        </style>`;
      content += `<h1>${course["name"]}</h1>${course["syllabus_body"]}<h2>Course Schedule</h2>`;
      content += `<table><tr><th>Date</th><th>Details</th></tr>`;
      events.forEach((event) => {
        content += `<tr><td>${event.dateString}</td>`;
        content += `<td><strong>${event.title}</strong><br/>${event.description}</td>`;
        content += `<td>${event.timeString}`;
      });
      content += "</table>";
      content += "<h2>Assignment Weights</h2>";
      content += `<table><tr><th>Assignment Group</th><th>Weight</th></tr>`;
      assignmentGroups.forEach((group) => {
        content += `<tr><td>${group.name}</td>`;
        content += `<td>${group.group_weight} %</td></tr>`;
      });
      content += "</table>";

      // Put the generated content into a new window and trigger a print on it.
      let win = window.open("", "Syllabus Export", "width=600,height=400");
      win.document.body.innerHTML = content;
      win.print();
      win.close();
    });
  } else if (sisMatch) {
    // if the url is using the alternate SIS ID format, get the standard url 
    // and load it, while prompting the user to run the bookmarklet again after 
    // the page loads.
    alert(
      "It looks like the URL for your Canvas page isn't quite what this tool requires. Your page should now reload with a URL that the tool can use. Once it loads back up, run this bookmark again to produce your syllabus."
    );
    const fetchCourse = fetch(`/api/v1/courses/${sisMatch[1]}`)
      .then((res) => res.json())
      .then((res) => {
        window.location.href = `/courses/${res.id}`;
      });
  } else {
    // if there's no recognizable ID, alert user that it didn't work
    alert(
      "It doesn't look like you're on a Canvas page. Try running this bookmark from your Canvas course home page."
    );
  }
})();
