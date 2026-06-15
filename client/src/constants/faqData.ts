export interface FAQItem {
  audience: 'attendee' | 'organizer' | 'both';
  id: string;
  question: string;
  steps: string[];
  expectedResult?: string;
}

export interface FAQSection {
  id: string;
  title: string;
  description: string;
  items: FAQItem[];
}

export const faqData: FAQSection[] = [
  {
    id: "account",
    title: "Account",
    description: "Manage your account — registration, login, and logout.",
    items: [
      {
        id: "create-account",
        question: "How do I create a new account?",
        audience: "attendee",
        steps: [
          "Enter an unregistered email, full name, organization (optional), valid password, and confirm password.",
          "Click \"Create Account\"."
        ],
        expectedResult: "1. Redirect to \"Check your email\" page.\n2. User receives a confirmation email."
      },
      {
        id: "confirm-account",
        question: "How do I confirm my account registration via email?",
        audience: "attendee",
        steps: [
          "Open the registered email.",
          "Open \"Confirm Your Signup\" email.",
          "Click the \"Confirm your mail\" link."
        ],
        expectedResult: "Redirects to a success page, then to the homepage (automatically logged in)."
      },
      {
        id: "login",
        question: "How do I log in to my account?",
        audience: "attendee",
        steps: [
          "Enter verified email and valid password.",
          "Click \"Login\"."
        ],
        expectedResult: "Successful login message; redirects to homepage."
      },
      {
        id: "logout",
        question: "How do I log out of my account?",
        audience: "attendee",
        steps: [
          "Click on the avatar (top right).",
          "Select \"Log out\"."
        ],
        expectedResult: "Displays \"Logged out successfully\" and shows \"Sign In\" button."
      }
    ]
  },
  {
    id: "profile",
    title: "Profile",
    description: "Update your profile picture, personal details, professional bio, and integrations.",
    items: [
      {
        id: "change-avatar",
        question: "How do I change my profile picture?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Profile\".",
          "On the \"My Profile\" page, click on the avatar frame.",
          "Select an image and click open."
        ],
        expectedResult: "Avatar changed successfully, the avatar frame displays the new image."
      },
      {
        id: "update-basic-info",
        question: "How do I update my basic profile information?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Profile\".",
          "In the \"Basic Information\" section on the \"My Profile\" page, click the \"Edit\" button.",
          "Enter a new name in the \"Full Name\" box.",
          "Click the \"Save Info\" button."
        ],
        expectedResult: "The new name is saved successfully and the information section displays the new name."
      },
      {
        id: "update-bio",
        question: "How do I update my professional bio?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Profile\".",
          "In the \"Professional Bio\" section on the \"My Profile\" page, click the \"Upload CV (PDF)\" button.",
          "Click on \"Click to Upload CV\".",
          "Select the CV file (pdf).",
          "Click the \"Process & Save\" button and wait for the system to process."
        ],
        expectedResult: "The information in the \"Professional Bio\" section correctly displays the information extracted from the CV."
      },
      {
        id: "connect-google",
        question: "How do I connect Google Calendar to create Google Meet links?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Profile\".",
          "Go to the \"Integrations\" section on the \"My Profile\" page.",
          "Click the \"Connect Google\" button and select the Gmail account authorized by the Admin."
        ],
        expectedResult: "The \"Connect Google\" button changes to \"Connected\"."
      }
    ]
  },
  {
    id: "agenda",
    title: "Agenda",
    description: "View your personal schedule and manage timezone preferences.",
    items: [
      {
        id: "view-agenda",
        question: "How do I view my personal schedule (My Agenda)?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Agenda\"."
        ],
        expectedResult: "Can view the schedule information, and by default, the schedule is in Schedule view."
      },
      {
        id: "change-timezone",
        question: "How do I change the timezone for my schedule?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Agenda\".",
          "Click on the \"Viewing Conference Time (Multiple)\" button."
        ],
        expectedResult: "The button changes from \"Viewing Conference Time (Multiple)\" to \"Viewing My Timezone ([Timezone info])\" and the time information in the schedule changes to my timezone."
      }
    ]
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    description: "Browse, subscribe to, and manage your AI chatbot subscription plans.",
    items: [
      {
        id: "view-plans",
        question: "How do I view my chatbot subscription plans?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Subscriptions\"."
        ],
        expectedResult: "The page displays \"Payment History\" including rows of payment history for the plans."
      },
      {
        id: "subscribe-plan",
        question: "How do I subscribe to and pay for a chatbot plan?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on \"Subscriptions\" on the navigation bar.",
          "Click the \"Subscribe with PayOS\" button for the desired plan.",
          "After the \"Confirm Subscription Purchase\" popup appears, click on the line \"I confirm this subscription purchase and understand billing is processed securely via PayOS. Purchased subscription benefits are applied based on the selected plan.\"",
          "Click the \"Confirm & Continue\" button.",
          "The payment information page appears, the user opens any Banking App to scan the VietQR code or transfers the exact amount with the required reference content."
        ],
        expectedResult: "- Scan/Transfer successfully and the payment information page shows a successful payment notification, then automatically redirects back to the plans information page.\n- The \"My Subscriptions\" page is updated with the newly subscribed plan information."
      }
    ]
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Create, manage, and view system and conference notifications.",
    items: [
      {
        id: "create-notification",
        question: "How do I create and send notifications?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Admin Tools\" on the navigation bar.",
          "Select \"Create Notifications\".",
          "In the \"1.Send to\" section, under \"CONFERENCE\" select \"All Conferences (System)\" and under \"Recipients\" select \"All users\".",
          "In the \"2.Content\" section, choose a template in \"Template\" or enter the notification title and content in \"Manual\".",
          "Click the \"Send Notification\" button."
        ],
        expectedResult: "The notification is sent to all users on the system."
      },
      {
        id: "create-template",
        question: "How do I create a notification template?",
        audience: "organizer",
        steps: [
          "In the \"2.Content\" section of the notification configuration, click \"Template\".",
          "Click the \"Create New\" button.",
          "Enter the template name, select the scope, enter the template notification title, and template notification content.",
          "Click the \"Save Template\" button."
        ],
        expectedResult: "The notification template is created successfully and can be found in \"Select Template\"."
      },
      {
        id: "edit-template",
        question: "How do I edit an existing notification template?",
        audience: "organizer",
        steps: [
          "In the \"2.Content\" section of the notification configuration, click \"Template\".",
          "Under \"Select Template\", click the template you want to edit.",
          "Click the \"Edit this template\" button.",
          "Edit the template information (template name, scope, template notification title, template notification content).",
          "Click the \"Save Changes\" button."
        ],
        expectedResult: "- If the template name is changed, the template's name in \"Select Template\" displays the new name.\n- If the notification title or content is changed, the information displayed in \"Message to send (editable)\" is the new information."
      },
      {
        id: "view-notifications",
        question: "How do I view my notifications?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the bell icon (currently showing the number of new messages).",
          "Click on the new notification (bold title) to view details."
        ],
        expectedResult: "Displays the entire notification content; once the read notification is closed, the new notification count decreases and the title of the read notification in the received list is no longer bold."
      }
    ]
  },
  {
    id: "papers",
    title: "Papers",
    description: "Search, filter, sort, and add papers to a conference.",
    items: [
      {
        id: "search-papers",
        question: "How do I search for papers?",
        audience: "attendee",
        steps: [
          "Click on \"Papers\" on the navigation bar.",
          "Enter the paper's name in the search bar."
        ],
        expectedResult: "Displays papers with names related to the entered name."
      },
      {
        id: "sort-papers",
        question: "How do I sort the papers list?",
        audience: "attendee",
        steps: [
          "Click on \"Papers\" on the navigation bar.",
          "Select \"Newest First\" in the sorting option box."
        ],
        expectedResult: "Papers are sorted by posting date from newest to oldest."
      },
      {
        id: "filter-papers",
        question: "How do I filter papers?",
        audience: "attendee",
        steps: [
          "Click on \"Papers\" on the navigation bar.",
          "Select the desired paper status under \"Status\" in the Filter box."
        ],
        expectedResult: "Successfully filters papers with the selected status."
      },
      {
        id: "add-papers",
        question: "How do I add papers to a conference?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar and select the desired conference.",
          "On the details page of the selected conference, click the \"Import Papers\" button.",
          "On the \"Import Papers\" page, click the \"Manual Entry\" button.",
          "In the \"Manual Entry\" section, enter the information for each paper on each row (click \"Add Row\" to add a new row). Required info: paper title (mandatory), abstract, primary author's email (mandatory), co-authors' emails (separated by ;).\nNote: All emails must belong to existing users in the system, otherwise the data will be rejected."
        ],
        expectedResult: "- New papers are added to the conference.\n- A new information row is added in the \"Import History\" and \"Import Logs\" sections on the \"Import Papers\" page."
      },
      {
        id: "papers-delete-paper",
        question: "How do I delete a paper?",
        audience: "organizer",
        steps: [
          "1. Log in successfully.",
          "2. Navigate to the **Papers** page or find the paper within a session.",
          "3. Click on the paper you want to delete to open its detail page.",
          "4. On the detail page, click the **Delete** button (trash icon).",
          "5. A confirmation dialog will appear. Click **Delete** to confirm.",
          "\nNote: **Exception:** If the paper is currently assigned to a session, an error message will display showing which session(s) it belongs to. You must remove the paper from those sessions before deleting it."
        ],
        expectedResult: "The paper is deleted from the system, and you are navigated back to the previous page."
      },
      {
        id: "papers-upload-presentation",
        question: "How do I upload a file or raw text as a presentation material for my paper?",
        audience: "attendee",
        steps: [
          "1. Log in successfully as the author or co-author of the paper.",
          "2. Navigate to the session page where your paper is scheduled.",
          "3. Locate your paper and expand its details.",
          "4. In the **Presentation Materials** section, click the button to add a new material.",
          "5. Select your preferred upload mode:\n   - **Upload File** — optionally enter a custom name, then select a file from your device.\n   - **Raw Text** — enter a custom name and paste your text into the provided text area (it will be saved automatically as a `.txt` file).",
          "6. Click **Save** to submit."
        ],
        expectedResult: "The uploaded file or raw text document is saved and immediately displayed under your paper's **Presentation Materials** list."
      },
      {
        id: "papers-delete-presentation",
        question: "How do I delete an uploaded presentation file from my paper in a session?",
        audience: "attendee",
        steps: [
          "1. Log in successfully as the author or co-author of the paper.",
          "2. Navigate to the session page containing your paper.",
          "3. Locate your paper and expand its details.",
          "4. In the **Presentation Materials** section, find the file you wish to remove.",
          "5. Click the trash icon next to that file.",
          "6. A confirmation dialog will appear. Click **Delete** to confirm."
        ],
        expectedResult: "The file is deleted and no longer appears under the **Presentation Materials** section of your paper."
      },
      {
        id: "papers-view-presentation",
        question: "How do I view an uploaded presentation file in a session?",
        audience: "both",
        steps: [
          "1. Log in successfully.",
          "2. Navigate to the session containing the paper.",
          "3. Locate the paper and expand its details.",
          "4. In the **Presentation Materials** section, click the file link or the external link icon next to the file you want to view.",
          "\nNote: **Access rules by role:**\n- **Author / Co-author** — can only view files attached to their own paper. They cannot view files uploaded by other authors.\n- **Organizer** — can view all files uploaded by all authors across all papers."
        ],
        expectedResult: "The file opens in a new browser tab or downloads to your device."
      }
    ]
  },
  {
    id: "conferences",
    title: "Conferences",
    description: "Find, filter, and create scientific conferences on the platform.",
    items: [
      {
        id: "search-conference",
        question: "How do I search for a conference?",
        audience: "attendee",
        steps: [
          "Click on \"Conferences\" on the navigation bar.",
          "Enter the conference name in the search bar."
        ],
        expectedResult: "Displays conferences with names related to the entered name."
      },
      {
        id: "sort-conferences",
        question: "How do I sort the conferences list?",
        audience: "attendee",
        steps: [
          "Click on \"Conferences\" on the navigation bar.",
          "Select \"Start Date (Latest First)\" in the sorting option box."
        ],
        expectedResult: "Conferences are sorted by start date from newest to oldest."
      },
      {
        id: "filter-conferences",
        question: "How do I filter conferences?",
        audience: "attendee",
        steps: [
          "Click on \"Conferences\" on the navigation bar.",
          "Select the desired conference status under \"Status\" in the Filter box."
        ],
        expectedResult: "Successfully filters conferences with the selected status."
      },
      {
        id: "create-conference",
        question: "How do I create a new conference?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Click the \"Create Conference\" button.",
          "Enter and select information on Step 1 \"Details\" page:\n+ Enter conference name, description (optional), location, keyword.\n+ Select conference format as in-person.\n+ Select valid timezone, start date, and end date (start date < end date and creation date <= start date), max chairs per session, conference status.\n+ Click \"Publish Conference\".",
          "After fully entering and selecting information, click the \"Create & Continue\" button.",
          "On Step 2 \"Banners & Assets\" page, click the \"Add Banner\" button to add a banner.",
          "Select image(s).",
          "Once the system finishes uploading the image, click the \"Finish & View List\" button."
        ],
        expectedResult: "- After step 5, it will navigate to the Step 2 \"Banners & Assets\" page with the following notification on the page: \"Conference Created! Now, add some visual banners to make it stand out.\"\n- After step 8, the conference is created successfully and automatically redirects to the \"Active Conferences\" page. The newly created conference can be found on the \"Active Conferences\" page."
      },
      {
        id: "conferences-delete-conference",
        question: "How do I delete a conference?",
        audience: "organizer",
        steps: [
          "1. Log in successfully.",
          "2. Click **Conferences** in the navigation bar and select the desired conference.",
          "3. On the conference detail page, click the **Delete Conference** button (trash icon).",
          "4. A confirmation dialog will appear. Click **Delete** to confirm."
        ],
        expectedResult: "The conference and all its associated sessions and papers are removed from the system. You are redirected back to the Conferences list."
      }
    ]
  },
  {
    id: "tickets",
    title: "Tickets",
    description: "Create, manage, and purchase conference attendance tickets.",
    items: [
      {
        id: "create-ticket",
        question: "How do I create a ticket for a conference?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar and select the desired conference.",
          "On the details page of the selected conference, click the \"Tickets\" button.",
          "On the \"Ticket Management\" page, click the \"New Ticket\" button.",
          "Enter the ticket name, tier name, price, select currency, enter quantity limit (leave blank for unlimited), select open and close sales date/time, toggle Active on if the ticket can receive registrations and toggle Active off if not, enter ticket description (optional), select ticket validity scope (all days / specific days).",
          "Click the \"Create Ticket\" button."
        ],
        expectedResult: "A new ticket is created successfully and the ticket information can be seen on the \"Ticket Management\" page."
      },
      {
        id: "edit-ticket",
        question: "How do I edit a ticket?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar and select the desired conference.",
          "On the details page of the selected conference, click the \"Tickets\" button.",
          "On the \"Ticket Management\" page, click the pen icon (edit) on the ticket you want to modify.",
          "Edit ticket information.",
          "Click the \"Save Changes\" button."
        ],
        expectedResult: "The ticket information displayed on the \"Ticket Management\" page is the newly updated information."
      },
      {
        id: "delete-ticket",
        question: "How do I delete a ticket?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar and select the desired conference.",
          "On the details page of the selected conference, click the \"Tickets\" button.",
          "On the \"Ticket Management\" page, click the trash icon (delete) on the ticket you want to delete.",
          "Click \"Yes\" to confirm deletion."
        ],
        expectedResult: "The deleted ticket no longer displays information on the \"Ticket Management\" page."
      },
      {
        id: "buy-ticket",
        question: "How do I register for or purchase a conference ticket?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select the conference you want to join.",
          "On the details page of the selected conference, click the \"Register Now\" button.",
          "Select a free ticket type (price displays as Free) that hasn't been registered yet.",
          "Click the \"Continue\" button.",
          "Click the \"Confirm Registration\" button."
        ],
        expectedResult: "- After step 6, a message displays under the selected ticket: \"Free Registration. No payment required. Your QR code will be sent by email.\"\n- After step 7:\n  + Displays popup message \"Registration confirmed! You are now registered. Your QR check-in code has been sent to your email.\"\n  + Receive an email with the registered ticket info and QR check-in code.\n  + The \"Registration Open\" section on the conference details page displays the line \"You already have a ticket\" and a \"View My Agenda\" button."
      },
      {
        id: "tickets-delete-ticket",
        question: "How do I delete a ticket?",
        audience: "organizer",
        steps: [
          "1. Log in successfully.",
          "2. Click **Conferences** in the navigation bar and select the desired conference.",
          "3. On the conference detail page, click the **Tickets** button.",
          "4. On the **Ticket Management** page, click the trash icon on the ticket you want to delete.",
          "5. Click **Yes** to confirm deletion.",
          "\nNote: **Exception:** If the ticket has already been purchased by attendees, it cannot be deleted to prevent invalidating existing registrations. A **Cannot Delete Ticket** dialog will appear. In this case, you can set the ticket to **Inactive** instead — this stops new purchases while keeping existing registrations valid."
        ],
        expectedResult: "The deleted ticket no longer appears on the Ticket Management page."
      }
    ]
  },
  {
    id: "check-in",
    title: "Check-in & Attendance",
    description: "Check in attendees via QR code and view session attendance lists.",
    items: [
      {
        id: "checkin-qr",
        question: "How do I check in attendees using QR code?",
        audience: "organizer",
        steps: [
          "Login successfully",
          "Click on \"Conferences\" on the navigation bar",
          "Select the conference you want to join",
          "At the detailed page of the selected conference, click the \"Scan QR\" button",
          "Select sessions to perform check-in",
          "Scan the code provided by the user"
        ],
        expectedResult: "- If user provides code has not been scanned before:\n  + After scanning the code, a successful check-in message \"Check-in Successful\" is displayed below the scanning frame.\n  + At the information row of the person who just checked in within the attendee list of that session, the status changes from pending to checked, and the successful check-in time (date and time) is recorded. \n- If user provides code has been scanned before: After scanning the code, a check-in failure message \"Scan Failed\" is displayed below the scanning frame."
      },
      {
        id: "view-attendance",
        question: "How do I view the attendee list for a session?",
        audience: "organizer",
        steps: [
          "Login successfully",
          "Click on \"Conferences\" on the navigation bar",
          "Select the conference you want to join",
          "At the detailed page of the selected conference, hover over the \"Attendance\" button and select the session you want to view the attendee list"
        ],
        expectedResult: "Able to view the attendee list in the selected session and overview information (total number of attendees, total number of checked-in attendees...)."
      }
    ]
  },
  {
    id: "session",
    title: "Session",
    description: "Create and manage conference sessions, invite chairs, and use AI-powered chair recommendations.",
    items: [
      {
        id: "create-session",
        question: "How do I create a session?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select the desired conference.",
          "On the details page of the selected conference, click the \"Session Manager\" button.",
          "On the page, click the \"Add Blank Session\" button.",
          "Enter session name, select valid start/end date and time, enter room.",
          "Select and drag & drop papers from the \"Accepted Papers\" list into the session.",
          "Select presentation start and end time for the paper.",
          "Click the \"Save\" button to finish creating the session."
        ],
        expectedResult: "Displays message: \"Sessions saved successfully! Please remember to notify participants about any changes to their presentation schedule.\""
      },
      {
        id: "edit-session",
        question: "How do I edit a session?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select the virtual conference that already has a Google Meet link in the session.",
          "On the conference details page, select the session where the link needs deleting.",
          "Click \"Edit session\", click the trash icon or use the delete key to remove the link.",
          "Click the \"Save\" button."
        ],
        expectedResult: "- Displays message \"Google Meet link removed successfully!\" (if deleted meeting link via trash icon).\n- Displays message \"Archive video link removed successfully!\" (if deleted archive link via trash icon).\n- Displays message \"Sessions saved!\" (if deleted using keyboard)."
      },
      {
        id: "view-session",
        question: "How do I view session details and join a virtual meeting?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select the virtual conference with the purchased ticket.",
          "On the conference details page, view the session."
        ],
        expectedResult: "Displays \"Join Virtual Meeting\" and \"Watch Recording\" buttons."
      },
      {
        id: "delete-session",
        question: "How do I delete a session?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select the conference to delete a session.",
          "On the conference details page, view the session to delete.",
          "Click the trash icon button and confirm deletion."
        ],
        expectedResult: "Displays message \"Delete Session Are you sure you want to delete the session 'Session auto open Join'? This action cannot be undone.\""
      },
      {
        id: "invite-chair",
        question: "How do I invite a chair for a session?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select conference.",
          "In the \"Agenda & Sessions\" section on the conference details page, click the \"Manage Chairs\" button on the session to invite a chair.",
          "In the \"Create Invitation\" section on the \"Chair Invitations\" page, enter the chair's name in the search bar.",
          "Select the chair to invite and their email will be auto-filled into the \"Invitee email\" box.",
          "Click the \"Send Invite\" button."
        ],
        expectedResult: "- In the \"Invitations\" section on the \"Chair Invitations\" page, 1 new row is added with details of the recently sent invite (status is pending).\n- The invited chair receives a notification on the system and the invitation via email."
      },
      {
        id: "cancel-chair-invitation",
        question: "How do I cancel a chair invitation?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select conference.",
          "In the \"Agenda & Sessions\" section on the conference details page, click the \"Manage Chairs\" button on the session.",
          "In the \"Invitations\" section on the \"Chair Invitations\" page, click the \"Cancel\" button in the Action column on the row of the PENDING invitation you want to cancel.",
          "A confirmation popup appears, click the \"Cancel Invitation\" button to confirm cancellation."
        ],
        expectedResult: "- Displays popup message \"Invitation canceled.\"\n- In the \"Invitations\" section on the \"Chair Invitations\" page, the status of this invitation row updates to expired.\n- On the \"Chair Invitation\" page, the 2 response buttons no longer display."
      },
      {
        id: "accept-chair",
        question: "How do I accept or decline a chair invitation?",
        audience: "attendee",
        steps: [
          "Log in successfully.",
          "Click on the bell icon.",
          "Click on the new notification (bold title) titled \"Chair invitation for [session]\" to view details.",
          "Copy the response link in the notification content.",
          "Open a browser and navigate to the copied link.",
          "On the \"Chair Invitation\" page, click the \"Accept Invitation\" button to accept."
        ],
        expectedResult: "- On the \"Chair Invitation\" page, the 2 response buttons disappear and are replaced by the message \"The invitation has been accepted. You can continue to your agenda to view the assigned session.\" and a \"Go to My Agenda\" button.\n- In the \"Invitations\" section on the \"Chair Invitations\" page, the status of this invitation row updates to accepted."
      },
      {
        id: "ai-chair",
        question: "How does the AI-powered chair recommendation work?",
        audience: "organizer",
        steps: [
          "Log in successfully.",
          "Click on \"Conferences\" on the navigation bar.",
          "Select conference.",
          "In the \"Agenda & Sessions\" section on the conference details page, click the \"Recommend Chair\" button on the session to invite a chair."
        ],
        expectedResult: "Displays \"Recommended Chairs\" suggesting the 5 most suitable chairs for the session."
      },
      {
        id: "session-ai-chair-recommendation",
        question: "How does the AI-powered chair recommendation work?",
        audience: "organizer",
        steps: [
          "1. Log in successfully.",
          "2. Click **Conferences** in the navigation bar and select your conference.",
          "3. In the **Agenda & Sessions** section on the conference detail page, click the **Recommend Chair** button on the session you want to assign a chair to."
        ],
        expectedResult: "The system displays a **Recommended Chairs** list of the 5 most suitable candidates for the session, ranked by relevance."
      },
      {
        id: "session-respond-chair-invitation-no-account",
        question: "How do I respond to a chair invitation if I don't have an account yet?",
        audience: "attendee",
        steps: [
          "1. Open the chair invitation email sent to your email address.",
          "2. Click the invitation response link in the email.",
          "3. If you do not have an account, register a new account (your account will initially have the Attendee role).",
          "4. Once logged in, return to the email and click the invitation response link again. You will be redirected to the **Chair Invitation** detail page.",
          "5. Review the conference and session details, then choose one of the following:\n   - Click **Accept Invitation** to accept.\n   - Click **Reject Invitation** to decline."
        ],
        expectedResult: "- **If accepted:** The invitation status updates to **ACCEPTED**, your account role is upgraded to Chair, and a confirmation message appears with a **Go to My Agenda** button.\n- **If rejected:** The invitation status updates to **REJECTED**, and your account role remains as Attendee."
      }
    ]
  },
  {
    id: "best-paper",
    title: "Best Paper",
    description: "Set up award templates, define conference awards, score papers, and view leaderboards.",
    items: [
      {
        id: "create-award-template",
        question: "How do I create an award template?",
        audience: "organizer",
        steps: [
          "Log into the system successfully (with Organizer or Admin role).",
          "Click \"Admin Tools\" on the navigation bar.",
          "Select \"Admin Dashboard\" from the dropdown menu.",
          "On the left sidebar, under \"Awards\", select \"Award Templates\".",
          "On the \"Awards Template Management\" page, click the \"+ Create Template\" button in the top right corner.",
          "In the \"Create Award Template\" popup, enter details:\n    a. Enter template name in the \"Template Name\" box (e.g., Best Paper Presentation).\n    b. Enter description in the \"Description\" box.\n    c. Enter Chair scoring weight percentage in \"Chair (%)\" and Attendee in \"Attendee (%)\" (total must equal 100%).",
          "In the \"Criteria\" section, click \"+ Add Criterion\" to add an evaluation criterion, then enter the criterion name in \"Name\" and weight in \"Weight %\" for each (total criteria weight must equal 100%).",
          "Click the \"Create Template\" button to finish."
        ],
        expectedResult: ""
      },
      {
        id: "create-award-no-template",
        question: "How do I create a conference award without using a template?",
        audience: "organizer",
        steps: [
          "Log into the system successfully (with Organizer role).",
          "Click \"Admin Tools\" on the navigation bar.",
          "Select \"Admin Dashboard\" from the dropdown menu.",
          "On the left sidebar, under \"Awards\", select \"Conference Awards\".",
          "On the \"Conference Awards\" page, select the conference to assign the award in the top \"Name\" dropdown.",
          "Click the \"+ Define Award\" button in the top right corner.",
          "In the \"Create Conference Award\" popup, leave \"Apply Template\" blank and manually enter details:\n   a. Select conference in the \"Conference\" box.\n   b. Enter award name in \"Award Name\" (e.g., Best Paper Presentation).\n   c. Enter description in the \"Description\" box.\n   d. Enter weight percentage in \"Chair (%)\" and \"Attendee (%)\" (total must equal 100%).\n   e. Select open and close evaluation times at \"Open Time\" and \"Close Time\".",
          "In the \"Criteria\" section, click \"+ Add Criterion\" to add criteria, enter name and weight for each (total criteria weight must equal 100%).",
          "In the \"Target Sessions\" section, check the sessions to apply the award to (or click \"Select All\" to select all).",
          "Click the \"Create Award\" button to finish."
        ],
        expectedResult: ""
      },
      {
        id: "create-award-with-template",
        question: "How do I create a conference award using a template?",
        audience: "organizer",
        steps: [
          "Log into the system successfully (with Organizer role).",
          "Click \"Admin Tools\" on the navigation bar.",
          "Select \"Admin Dashboard\" from the dropdown menu.",
          "On the left sidebar, under \"Awards\", select \"Conference Awards\".",
          "On the \"Conference Awards\" page, select the conference to assign the award in the top \"Name\" dropdown.",
          "Click the \"+ Define Award\" button in the top right corner.",
          "In the \"Create Conference Award\" popup:\n   a. Select conference in the \"Conference\" box.\n   b. At the \"Apply Template\" box, select the template to apply (e.g., Overall Best Presentation Award) - the system will automatically fill in the award name, description, Chair/Attendee percentages, and all criteria from the template into the corresponding fields.",
          "Check and edit the info if necessary (name, description, weights, criteria).",
          "Select open and close evaluation times at \"Open Time\" and \"Close Time\".",
          "In the \"Target Sessions\" section, check the sessions to apply the award to (or click \"Select All\").",
          "Click the \"Create Award\" button to finish."
        ],
        expectedResult: ""
      },
      {
        id: "score-papers",
        question: "How do I score papers for a conference award?",
        audience: "both",
        steps: [
          "Log into the system successfully.",
          "Click \"Conferences\" on the navigation bar.",
          "Select the conference to score.",
          "On the conference details page, find the \"Accepted Papers\" section.",
          "Find the paper to score and click the \"View Detail\" button.",
          "On the paper details page, navigate to the open awards section (e.g., Best Paper Presentation).",
          "Enter scores for each evaluation criterion based on the displayed scale.",
          "(Optional) Enter evaluation comments in the \"Comment\" box.",
          "Click the \"Submit\" button to confirm scoring."
        ],
        expectedResult: ""
      },
      {
        id: "view-leaderboard",
        question: "How do I view the award leaderboard?",
        audience: "both",
        steps: [
          "Log into the system successfully.",
          "Click \"Conferences\" on the navigation bar.",
          "Select the conference to view results.",
          "On the conference details page, find the Leaderboard section.",
          "View info on the leading papers for each award, including:"
        ],
        expectedResult: ""
      },
      {
        id: "best-paper-view-scores-reviews",
        question: "How do I view the scores and reviews of a paper?",
        audience: "both",
        steps: [
          "1. Log in successfully.",
          "2. Click on your user profile menu and select **My Papers** (or navigate directly to your papers dashboard).",
          "3. On the **My Papers** list, click on the paper you want to check.",
          "4. On the paper detail page, scroll down to the **Peer Reviews & Markings** section.",
          "\nNote: **Access rules by role:**\n- **Authors** — can only view scores and comments for their own papers.\n- **Chairs and Attendees** — can only view the scores and comments they themselves have submitted.\n- **Organizers** — can view all scores and comments across all papers."
        ],
        expectedResult: "The **Peer Reviews & Markings** section displays a list of reviews and markings, each containing: the reviewer's profile, the review date, the reviewer's final recommendation status, the review score, and detailed comments."
      }
    ]
  },
  {
    id: "chatbot",
    title: "Chatbot AI",
    description: "Use the built-in AI assistant to automate tasks and query conference information.",
    items: [
      {
        id: "chatbot-create-conference",
        question: "How can the Chatbot AI autofill the conference creation form?",
        audience: "organizer",
        steps: [
          "Log into the system successfully with an Organizer account.",
          "Click on \"Conferences\" on the navigation bar.",
          "Click the \"Create Conference\" button.",
          "On the conference creation page, open the Chatbot AI interface.",
          "Enter natural language request into the chat box (e.g., \"Create an SOICT conference from 31/05 lasting 5 days, at SECC center. Hybrid format, timezone GMT+7, status is draft\").",
          "Click \"Send\" and wait for the chatbot to process.",
          "Verify the automatically filled information fields on the form.",
          "Edit if needed, then click \"Create & Continue\" to finish."
        ],
        expectedResult: ""
      },
      {
        id: "chatbot-schedule",
        question: "How can the Chatbot AI auto-schedule sessions?",
        audience: "organizer",
        steps: [
          "Log into the system successfully with an Organizer account.",
          "Click on \"Conferences\" on the navigation bar and select the conference that needs session scheduling.",
          "On the conference details page, click the \"Session Manager\" button (requires sessions to be already created).",
          "Open the Chatbot AI interface.",
          "Enter natural language request into the chat box (e.g., \"Auto-fill occurrence times for sessions starting from 31/05, 3 sessions per day, each session lasting 60 minutes, 15-minute break between sessions\").",
          "Click \"Send\" and wait for the chatbot to process.",
          "Verify the automatically filled times for each session.",
          "Edit if needed, then click \"Save\" to finish."
        ],
        expectedResult: ""
      },
      {
        id: "chatbot-lookup",
        question: "How do I use the Chatbot AI to look up conference information?",
        audience: "attendee",
        steps: [
          "Log into the system successfully.",
          "Click on \"Conferences\" on the navigation bar and select the desired conference.",
          "On the conference details page, open the Chatbot AI interface.",
          "Enter natural language question into the chat box (e.g., \"Provide information on the SOICT 2026 conference\").",
          "Click \"Send\" and wait for the chatbot's response."
        ],
        expectedResult: ""
      },
      {
        id: "chatbot-bio",
        question: "How do I use the Chatbot AI to improve my Bio Profile?",
        audience: "attendee",
        steps: [
          "Log into the system successfully.",
          "Click on the avatar frame in the top right corner.",
          "Select \"My Profile\".",
          "In the \"Professional Bio\" section, open the Chatbot AI interface.",
          "Enter natural language request into the chat box (e.g., \"Update my bio profile to be more professional, emphasize NLP research, markdown format, including my papers already in the system\").",
          "Click \"Send\" and wait for the chatbot to process.",
          "Review the new bio content proposed by the chatbot.",
          "Click \"Apply\" to apply the content to the \"Professional Bio\" box or edit further if needed.",
          "Click \"Update Bio\" to save."
        ],
        expectedResult: ""
      }
    ]
  },
  {
    id: "proceeding",
    title: "Proceeding",
    description: "Create, edit, and export the official conference proceedings as a PDF publication.",
    items: [
      {
        id: "create-proceeding",
        question: "How do I create a conference proceeding?",
        audience: "organizer",
        steps: [
          "Log in successfully to the system",
          "Click on \"Proceeding\" on the navigation bar",
          "On the \"Proceeding Publisher\" page, select the conference name to create a proceeding from the \"-Select Conference-\" bar"
        ],
        expectedResult: "The system will automatically fill in information retrieved from the conference into the Cover, Committee, Venue & Info, At a Glance, Keynotes, Papers sections and automatically generate a pdf"
      },
      {
        id: "edit-proceeding",
        question: "How do I edit the proceeding content?",
        audience: "organizer",
        steps: [
          "Log in successfully to the system",
          "Click on \"Proceeding\" on the navigation bar",
          "On the \"Proceeding Publisher\" page, select the conference name to create a proceeding from the \"-Select Conference-\" bar",
          "After the system completely loads information, in the \"Section\" part, click on \"Cover\"",
          "Edit the information: a. Title, Date, Venue: Edit by entering new information b. Sponsor logo: Click \"choose file\" to add a new image or click the \"x\" mark on the existing image to delete it.",
          "Click the \"Save\" button"
        ],
        expectedResult: "When clicking on \"PDF Editor\" or \"PDF Review\" in the \"Section\" part, the file displays the newly edited information"
      },
      {
        id: "edit-pdf",
        question: "How do I edit the proceeding PDF directly?",
        audience: "organizer",
        steps: [
          "Log in successfully to the system",
          "Click on \"Proceeding\" on the navigation bar",
          "On the \"Proceeding Publisher\" page, select the conference name to create a proceeding from the \"-Select Conference-\" bar",
          "After the system completely loads information, in the \"Section\" part, click on \"PDF Editor\"",
          "Click on the \"Open in Editor\" button",
          "Move to the page where you want to add text and click the button with the \"T\" icon (Add text block)",
          "The text input frame appears and enter the content into the frame",
          "In \"Properties\" you can choose the font, size, style (bold, italic), alignment, color, size and position of the frame, rotate frame, layer, add to table of contents, and move the text frame to the desired position.",
          "Click the \"Save\" button"
        ],
        expectedResult: "The text displays the content and format on the file as added"
      },
      {
        id: "preview-pdf",
        question: "How do I preview and export the proceeding as a PDF?",
        audience: "both",
        steps: [
          "Log in successfully to the system",
          "Click on \"Proceeding\" on the navigation bar",
          "On the \"Proceeding Publisher\" page, select the conference name to create a proceeding from the \"-Select Conference-\" bar",
          "After the system completely loads information, in the \"Section\" part, click on \"PDF Review\""
        ],
        expectedResult: "The complete proceeding book can be viewed"
      }
    ]
  }
];
