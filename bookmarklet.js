void(
  (function () {
    function paginated_fetch(
      url = is_required("url"), // Improvised required argument in JS
      page = 1,
      previousResponse = []
    ) {
      return fetch(`${url}&page=${page}`) // Append the page number to the base URL
        .then((response) => response.json())
        .then((newResponse) => {
          const response = [...previousResponse, ...newResponse]; // Combine the two arrays
          if (newResponse.length !== 0) {
            page++;
            return paginated_fetch(url, page, response);
          }
          return response;
        });
    }
    function Event(title, description, start, end) {
      // Define an event object to be used by assignments and calendar entries
      this.title = title;
      this.description = description;
      this.start = start;
      this.end = end;
    }

    // get course ID from url
    const courseIdMatch = /courses\/(\d+)/;
    let match = courseIdMatch.exec(window.location.pathname);
    let courseId = match[1];

    // fetch course info
    const fetchCourse = fetch(
      `/api/v1/courses/${courseId}?include[]=syllabus_body`
    ).then((res) => res.json());

    // fetch parse calendar info and parse into Event objects
    const fetchCalendar = paginated_fetch(
      `/api/v1/calendar_events?context_codes[]=course_${courseId}&all_events=true`
    ).then((res) => {
      let events = [];
      res.forEach((calendarEvent) => {
        let event = new Event(
          calendarEvent.title,
          calendarEvent.description,
          new Date(calendarEvent.start_at),
          new Date(calendarEvent.end_at)
        );
        events.push(event);
      });
      return events;
    });

    // fetch assignments and parse into Event objects
    const fetchAssignments = paginated_fetch(
      `/api/v1/courses/${courseId}/assignments?ignoreThis=sure`
    ).then((res) => {
      let events = [];
      res.forEach((assignment) => {
        let event = new Event(
          assignment.name,
          assignment.description,
          assignment.due_at ? new Date(assignment.due_at) : null,
          null
        );
        events.push(event);
      });
      return events;
    });

    // fetch assignment groups
    const fetchAssignmentGroups = paginated_fetch(
      `/api/v1/courses/${courseId}/assignment_groups?ignoreThis=sure`
    );

    // When all info is collected...
    Promise.all([
      fetchCourse,
      fetchCalendar,
      fetchAssignments,
      fetchAssignmentGroups,
    ]).then((values) => {
      
      let course = values[0];

      // merge and sort calendar entries and assignments
      let events = [...values[1], ...values[2]];
      events.sort((a, b) => a.start - b.start);
      
      let assignmentGroups = values[3];
      
      // set some standard options for displaying date/time info
      let dateOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      let timeOptions = {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      };

      // create the html for the syllabus output
      let content = `<style>
        table { border-spacing:0; }
        th { background-color: #EEE; }
        td { border: 1px solid; }
      </style>`
      content += `<h1>${course["name"]}</h1>${course["syllabus_body"]}<h2>Course Schedule</h2>`;
      content += `<table><tr><th>Date</th><th>Details</th></tr>`;
      events.forEach((event) => {
        let dateString = event.start
          ? event.start.toLocaleDateString("en-us", dateOptions)
          : "";
        if (event.start && event.end) {
          var timeString = `${event.start.toLocaleTimeString(
            "en-US",
            timeOptions
          )} to ${event.end.toLocaleTimeString("en-US", timeOptions)}`;
        } else if (event.start) {
          var timeString = event.start.toLocaleTimeString("en-US", timeOptions);
        } else {
          var timeString = "";
        }
        content += `<tr><td>${dateString}</td>`;
        content += `<td><strong>${event.title}</strong><br/>${event.description}</td>`;
        content += `<td>${timeString}`;
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
  })()
);
