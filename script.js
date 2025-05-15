const SORTER_API_URL = "https://script.google.com/macros/s/AKfycbyWfDz3H40k9YrDG3sXsjtXWX8-l1i5gp51CnFXDinKPLEzJqKo34NDDuRQvxIcaFbbwQ/exec"
const TEST_API_URL = "https://script.google.com/macros/s/AKfycbwBBpviDWh21a2tBaf1rgV0akY7E94VFGm9dPa4pnuD5ToHQp5Pn8Pa4vcT2_1M-k-7/exec"
const DATABASE_API_URL = "https://script.google.com/macros/s/AKfycbw7g4dE5FknPjGMCg1kCy1CeaRfI5xFlf97QzAw5PFN0yQqywqoaOiyuUjOKFJ5HvvPcw/exec"

const textErrorMessage = "Insufficient information to determine EC level"

const sectionHeaders = [
    [],
    [
        "Please indicate the extent to which you disagree or agree with the following statements about your local government",
        "Indicate the following characteristics about your local government (Select all that apply)",
        "Please rate the effectiveness of your local government's partnerships with the following stakeholder groups when delivering on programs in your community"
    ],
    [
        "Please mark the extent to which you disagree or agree with the following statements about your community and its community-based organizations (CBOs)",
        "Please indicate the following characteristics about your community and its CBOs"
    ]
]

//////// Build out the questions page ///////////

//Fetch the questions from the spreadsheet
async function fetchQuestionData() {
    // Make the simple loading animation
    const question_loading = document.getElementById('question-loading');
    const interval = startLoadingAnimation();

    try {
        const response = await fetch(SORTER_API_URL);
        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json()
        return data.questions
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('output').textContent = `Error: ${error.message}`;
    } finally {
        clearInterval(interval);
        question_loading.classList.add("hidden");
    }
}

// Show the questions on the page
async function fillInQuestions() {
    let questions = await fetchQuestionData()
    
    // Create an array to hold all the question pages, to go back and forth between sections
    let maxPage = Math.max(...questions.map(q => q.page))
    const questionPageDivs = Array.from({ length: maxPage }, () => document.createElement("div"))

    // Create div sections in each page
    var sectionDivs = []
    for (let i = 0; i < questionPageDivs.length; i++) {
        // Find the total number of sections in the page (based off the max number the user has entered)
        let maxSectionsInPage = Math.max(...questions.filter(q => q.page==(i+1)).map(q => q.page_section))

        // Create new divs for the sections and add them to the overall question page div
        sectionDivs[i] = Array.from({ length: maxSectionsInPage }, () => document.createElement("div"))
        questionPageDivs[i].append(...sectionDivs[i])
    }

    // Fill in section headers
    for (let i = 0; i < sectionHeaders.length; i++) {
        for (let j = 0; j < sectionHeaders[i].length; j++) {
            createAndAppendElement(sectionDivs[i][j],'p',sectionHeaders[i][j],"section-header")
        }
    }

    // Add questions to the right page divs, Keep track of which Q IDs have already been created
    var seenQuestionIDs = new Set()
    for (const q of questions) {
        if (seenQuestionIDs.has(q.id)) {
            continue
        }
        seenQuestionIDs.add(q.id)
        questionDiv = makeQuestionDiv(q)

        // Add question element to the right page & section
        sectionDivs[q.page-1][q.page_section-1].appendChild(questionDiv)
    }

    addQuestionPageButtons(questionPageDivs)
    surveyDiv.append(...questionPageDivs)
}

// Make a question element to add
function makeQuestionDiv(q) {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.innerHTML = `<p>${q.question}</p>`;

    if (q.type === "Open Response") {
        const input = document.createElement("textarea");
        input.name = q.id;
        input.rows = 2;
        input.cols = 50;
        input.className = "open-response"
        questionDiv.appendChild(input);
    } else {
        // Default to radio unless it's multiple selection
        let type = "radio";
        if (q.type === "Multiple Selection") {
            type = "checkbox";
        }

        q.options.forEach((option) => {
            const label = document.createElement("label");
            label.innerHTML = `
                <input type="${type}" name="${q.id}" value="${option.option_code}"> ${option.option_text}
            `;
            questionDiv.appendChild(label);
        });
    }

    return questionDiv;
}

// Add in back and next buttons to each page
function addQuestionPageButtons(questionPageDivs) {
    
    for (let i = 0; i < questionPageDivs.length; i++) {
        let p = questionPageDivs[i]       

        if (i > 0) {
            p.classList.add("hidden")
            p.appendChild(createBackButton(i,questionPageDivs))
        }

        if (i+1 < questionPageDivs.length) {
            p.appendChild(createNextButton(i,questionPageDivs))
        } else {
            p.appendChild(createSubmitButton(questionPageDivs))
        }
    }

    // Also add a back button for the results page, to return to the questions
    document.getElementById("results").appendChild(createBackButton(null,questionPageDivs,resultsPage=true))
}

// Create buttons for each page for interaction
function createNextButton(pageIndex,questionPageDivs) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.style.marginTop = "20px";
    // Hide the current page & show the next page on click
    nextButton.addEventListener("click", () => {
        questionPageDivs[pageIndex].classList.add("hidden")
        questionPageDivs[pageIndex+1].classList.remove("hidden")
        // Go to the top of the next page
        window.scrollTo({ top: 0});
    })
    nextButton.className = "next-button"
    return nextButton
}

function createBackButton(pageIndex,questionPageDivs) {
    const backButton = document.createElement("button");
    backButton.textContent = "Back";
    backButton.style.marginRight = "10px";
    // Hide the current page & show the previous page on click
    backButton.addEventListener("click", () => {
        questionPageDivs[pageIndex].classList.add("hidden")
        questionPageDivs[pageIndex-1].classList.remove("hidden")
        // Go to the bottom of the previous page
        window.scrollTo({ top: document.body.scrollHeight});
    })
    backButton.className = "back-button"
    return backButton
}

function createSubmitButton(questionPageDivs) {
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit";
    submitButton.addEventListener("click", () => {
        document.getElementById("survey").classList.add("hidden")
        document.getElementById("results").classList.remove("hidden")
        submitAnswers()
        // Go to the top of the next page
        window.scrollTo({ top: 0});
    })
    submitButton.className = "submit-button"
    return submitButton
}


// Load survey
const surveyDiv = document.getElementById("survey");

fillInQuestions()

/////// Find the results when the user submits /////////////

//Get the answers the user has selected for each question
function getSelectedAnswers() {
    const selectedAnswers = {};
    const questions = document.querySelectorAll('.question');

    questions.forEach((questionDiv) => {
        // First check if it's a radio/checkbox question
        const input = questionDiv.querySelector('input[type="radio"], input[type="checkbox"]');
        if (input) {
            const questionId = input.name; // Get the name attribute
            const selectedInputs = questionDiv.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked'); // Get selected inputs (radio or checkbox)
            const selectedOptions = Array.from(selectedInputs).map(input => input.value); // Collect codes of selected inputs
            
            // Save the selected options or null if none selected
            selectedAnswers[questionId] = selectedOptions.length > 0 ? selectedOptions : null;
        } else {
            // Handle open response (textarea)
            const textarea = questionDiv.querySelector('textarea');
            if (textarea) {
                selectedAnswers[textarea.name] = [textarea.value.trim()] || null;
            }
        }
    });    

    return selectedAnswers;
}

async function getMetadata() {
    // Get time in Eastern
    let submission_time = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(new Date());

    try {
        var ip_response = await fetch("http://ip-api.com/json/");
        var ip_data = await ip_response.json()
    } catch (error) {
        ip_data = {}
    }

    const error_message = "N/A"
    const metadata =  {
        "Submission Time": submission_time, 
        "State/Region": ip_data.region ?? error_message, 
        "Country": ip_data.country ?? error_message, 
        "IP Address": ip_data.query ?? error_message, 
        "City": ip_data.city ?? error_message,
        "ZIP Code": ip_data.zip ?? error_message
    }

    return metadata
}

// Send the answers through a POST call

async function submitAnswers(recordResponse=true) {
    const selectedAnswers = getSelectedAnswers()
    const postArguments = {'selected_answers': selectedAnswers}

    const response = await fetch(SORTER_API_URL, {
        // redirect: "follow",
        method: "POST",
        body: JSON.stringify(postArguments),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
      });

    const responseData = await response.json(); // Parse the JSON response
    showResults(responseData)

    const metadata = await getMetadata()

    if (recordResponse) {
        writeToDatabase(selectedAnswers, responseData, metadata)
    }
}

// Take the response and add it as a row to the database
async function writeToDatabase(answers, results, metadata) {
    full_response = {"results": results, "answers": answers, "metadata": metadata}
    const database_response = await fetch(DATABASE_API_URL, {
        // redirect: "follow",
        method: "POST",
        body: JSON.stringify(full_response),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
      });
}

///////// Display the results ////////////////////

function showResults(responseData) {
    console.log(responseData)
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    showResultsContextParagraph(resultsDiv)

    makeSaveResultsButton(resultsDiv)

    // Create a container for each row
    const createRow = () => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        return row;
    };

    // Add header row for ECs
    const ecHeaderRow = createRow();
    createAndAppendElement(ecHeaderRow,'h3',"Local Government Enabling Conditions:","ecColumnHeader")
    createAndAppendElement(ecHeaderRow,'h3',"Community Enabling Conditions:","ecColumnHeader")
    resultsDiv.appendChild(ecHeaderRow);

    // Add elements for charts
    var govECNamesAndScores = []
    var communityECNamesAndScores = []
    const chartRow = createRow();
    var govChart = document.createElement('div');
    var communityChart = document.createElement('div')
    chartRow.appendChild(govChart)
    chartRow.appendChild(communityChart)
    resultsDiv.appendChild(chartRow);

    // Add EC Scores
    const ecRow = createRow();
    ecRow.appendChild(createECColumn(responseData.ec_scores["Local Government"],govECNamesAndScores));
    ecRow.appendChild(createECColumn(responseData.ec_scores["Community"],communityECNamesAndScores));
    resultsDiv.appendChild(ecRow);

    // Fill in charts with EC scores
    createBarChart(govChart,govECNamesAndScores)
    createBarChart(communityChart,communityECNamesAndScores)

    addResultsBackButton()
}

// Takes in value between 0 and 1, returns score out of 5
function calcScoreOutOfFive(score) {
    return Math.min(Math.floor(score * 5) + 1, 5)
}

function showResultsContextParagraph(div) {
    const paragraph = `
    <p>
      The following results show the level of each “enabling condition” based on your answers to the survey.
      These results can give you a sense of the strengths and growth areas for your local government and community when trying to implement economic initiatives.
      <i>Note that these results are based only on your responses to the survey questions, and may not reflect the full complexity of your community’s context.</i>
    </p>
  `;
    div.innerHTML = paragraph;
}

// Button to save the results
function makeSaveResultsButton(div) {
    const button = document.createElement("button");
    button.textContent = "Save my results";
    button.style.marginTop = "20px";
    button.addEventListener("click", downloadPDF);
    button.className = "results-button"

    // Append the button to the body (or another container)
    div.appendChild(button);
}

// Use the html2pdf library to download a pdf of the page
function downloadPDF() {
    const elements = document.body

    const screenWidth = window.innerWidth
    const screenHeight = document.body.scrollHeight

    let orientation;
    if (screenHeight > screenWidth) {
        orientation = 'portrait'
    } else {
        orientation = 'landscape'
    }

    const options = {
        filename:     'CommunityResults.pdf',
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'px', format: [screenWidth, screenHeight], orientation: orientation, hotfixes: ["px_scaling"]}
    };

    html2pdf().set(options).from(elements).save();
}

/// Makes the bar chart with results
function createBarChart(wrapperElement,scoreTracker) {
    wrapperElement.className = "chart-wrapper"

    chartCanvas = document.createElement('canvas')
    wrapperElement.appendChild(chartCanvas)
    
    const ecLabels = scoreTracker.map(row => row[0])
    const ecScores = scoreTracker.map(row => row[1])
    const ecDivElements = scoreTracker.map(row => row[2])

    const chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: ecLabels,
            datasets: [{
                data: ecScores.map(x => calcScoreOutOfFive(x)),
                backgroundColor: ecScores.map(x => calcScoreOutOfFive(x)).map(score => getBarColor(score,5))
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            scales: {
                x: {
                    suggestedMax: 5, // Ensure the x-axis always goes up to 5
                    ticks: {
                        stepSize: 1 // Force tick marks to increment by 1
                    },
                }
            },
            plugins: {
                legend: { display: false }, // Hide legend
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const value = tooltipItem.raw;
                            return `Level: ${value} out of 5`; // Example: Converts score to percentage
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    ecDivElements[index]?.scrollIntoView({ behavior: 'smooth' });
                } 
            }
        }
    });

    function getBarColor(score,max) {
        // Define start and end colors in HSL
        const [h1, s1, l1] = [110, 60, 75];
        const [h2, s2, l2] = [259, 64, 26];
    
        // Interpolate each component
        const h = h1 + score/max * (h2 - h1);
        const s = s1 + score/max * (s2 - s1);
        const l = l1 + score/max * (l2 - l1);
    
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
}

//// Builds the enabling conditions info
function createECColumn(ecListObject,scoreTracker) {
    const ecListDiv = document.createElement('div');
    for (let ec in ecListObject) {
        info = ecListObject[ec]
        ecListDiv.append(createECBlock(ec,info,scoreTracker))
    }
    return ecListDiv
}

function createECBlock(name, info, scoreTracker) {
    const ecDiv = document.createElement('div');
    
    createAndAppendElement(ecDiv,'h2',name,"ecName")
    
    if (info.score != null) {
        // Calculate a score out of 5, also show the exact score 0-1
        createAndAppendElement(ecDiv, 'p',`Level: ${calcScoreOutOfFive(info.score)} out of 5`,'ecLevel')
        // createAndAppendElement(ecDiv, 'p',`Exact score: ${info.score.toFixed(2)}`,'ecLevel') [Deprecated]
        // showECLevel(info.level,ecDiv) [Depracated]
    } else {
        createAndAppendElement(ecDiv, 'p',`Score could not be calculated (not enough questions answered)`,'ecLevel')
    }

    // If the EC could not be found (no text attached), return the error message and stop
    if (info.text == null) {
        const ecErrorMessage = document.createElement('p')
        ecErrorMessage.textContent = textErrorMessage
        ecDiv.appendChild(ecErrorMessage)
        return ecDiv
    }

    createAndAppendElement(ecDiv, 'p', 'Overall description:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.overall, 'ecExplanation');
    createAndAppendElement(ecDiv, 'p', 'What a high score means:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.high, 'ecExplanation');
    createAndAppendElement(ecDiv, 'p', 'What a low score means:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.low, 'ecExplanation');
    
    ecDiv.className = "ecBlock"
    scoreTracker.push([name,info.score,ecDiv])
    return ecDiv
}

// Helper function to create a block of text
function createAndAppendElement(parent, tag, textContent, className = '') {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }

    element.innerHTML = processTextBlockToHTML(textContent)  

    parent.appendChild(element);
}

// Get the line breaks and bullets to show up correctly with HTML
function processTextBlockToHTML(text) {
    return text
        .split('\n') // Split up each line
        .map(line => {
        const trimmed = line.trimStart(); // Strip leading space
        return trimmed.startsWith('-') // Check if it starts with a hyphen, turn into bullet point if so
            ? `<li>${trimmed.slice(1).trim()}</li>` 
            : trimmed.replace(/\n/g, '<br>');
        })
        .join('')
        .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
}

// Make a back button that takes the user back to the survey
function addResultsBackButton () {
    const backButton = document.createElement("button");
    backButton.textContent = "Back";
    backButton.style.marginTop = "20px";
    backButton.addEventListener("click", () => {
        document.getElementById("survey").classList.remove("hidden")
        document.getElementById("results").classList.add("hidden")
        submitAnswers()
        // Go to the bottom of the previous page
        window.scrollTo({ top: document.body.scrollHeight});
    })
    backButton.className = "submit-button"
    document.getElementById("results").appendChild(backButton)
}


/////// Loading Animations ///////

function startLoadingAnimation() {
    const dots = document.getElementById('dots');
    let count = 0;
    return setInterval(() => {
        count = (count + 1) % 4;
        dots.textContent = '.'.repeat(count);
    }, 500);
}



//////// Testing /////////
///// Fills in all questions through a keyboard shortcut. Comment these out after Beta testing.

// Auto-fill in all responses
function selectAllRadios(value) {
    // Get all radio buttons on the page
    const radios = document.querySelectorAll('input[type="radio"]');
    
    // Loop through the radios and select the ones matching the specified value
    radios.forEach(radio => {
        if (radio.value === value) {
            radio.checked = true;
        }
    });
}

document.addEventListener("keydown", (event) => {
    // console.log(event)
    
    if (event.shiftKey && (event.ctrlKey || event.metaKey || event.altKey)) {
        // Prevent default behavior if needed
        event.preventDefault();

        // Fill out questions randomly
        if (event.code === "KeyS") {
            

            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                let group = document.querySelectorAll(`input[name="${radio.name}"]`);
                let randomChoice = group[Math.floor(Math.random() * group.length)];
                randomChoice.checked = true;
                randomChoice.dispatchEvent(new Event('change', { bubbles: true }));
            });

            document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                if (Math.random() < 0.5) { // 50% chance to check the input
                    input.checked = true;
                    input.dispatchEvent(new Event('change', { bubbles: true })); // Trigger event if needed
                } else {
                    input.checked = false;
                }
            });

            if (event.ctrlKey && event.metaKey) {
                // // Hide the survey and submit button
                document.getElementById("survey").classList.add("hidden");
                document.getElementById("results").classList.remove("hidden");

                submitAnswers(recordResponse = false)
            }
        }
    }

    if (event.code === "Enter" && (event.ctrlKey || event.metaKey || event.altKey)) {
        // // Hide the survey and submit button
        document.getElementById("survey").classList.add("hidden");
        document.getElementById("results").classList.remove("hidden");

        submitAnswers(recordResponse = false)
    }
});


// Deprecated code blocks

    // Add Local Government and Community profiles [in showResults]
    // const profileRow = createRow();
    // profileRow.appendChild(createProfileColumn('Local Government Profile:', responseData.local_gov_profile));
    // profileRow.appendChild(createProfileColumn('Community Profile:', responseData.community_profile));
    // resultsDiv.appendChild(profileRow);

// function showECLevel(level,parent) {
//     if (level == null) {
//         createAndAppendElement(parent,'p', `Level: "N/A"`,"ecLevel")
//     } else {
//         let levelIntro = document.createTextNode("Level: ")
//         let coloredScoreText = document.createElement('span')
//         coloredScoreText.textContent = level
//         coloredScoreText.className = `score${level}`
//         let showScore = document.createElement('p')
//         showScore.appendChild(levelIntro)
//         showScore.appendChild(coloredScoreText)
//         showScore.className = "ecLevel"
//         parent.appendChild(showScore)
//     }
// }

//// Builds the  profile info
// function createProfileColumn(title, info) {
//     const sectionDiv = document.createElement('div');

//     createAndAppendElement(sectionDiv,'h3',title,"profileIntro")
//     createAndAppendElement(sectionDiv,'h1',info.profile,"profileName")
//     createAndAppendElement(sectionDiv,'p',"Profile explanation:",'paragraphHeader')

//     if (info.text == null) {
//         var profileDescription = "Could not find profile"
//     } else {
//         var profileDescription = info.text.description
//     }
//     createAndAppendElement(sectionDiv,'p',profileDescription)

//     return sectionDiv;
// }