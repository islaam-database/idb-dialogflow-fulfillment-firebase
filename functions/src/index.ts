import * as functions from "firebase-functions";
import IslaamDBClient from "islaam-db-client";
const { WebhookClient, Suggestion } = require("dialogflow-fulfillment");

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const dialogflowFulfillment = functions.https.onRequest((request, response) => {
    // set up stuff
    const mainAgent = new WebhookClient({ request, response });
    const intentMap = new Map<string, (agent: any) => void>();
    const key = request.headers.authorization;
    if (!key) return response.send("Missing google key in authorization header.");
    const idb = new IslaamDBClient(key);

    // who is handler
    intentMap.set("who-is", async (agent: any) => {
        const personQuery = agent.parameters.person as string;
        const person = await idb.queryForPerson(personQuery);
        const bioText = await person.getBio(idb);

        // add responses
        agent.add(bioText);

        const randomIndex = Math.floor(Math.random() * bioText.praiserNames.length);
        const randomTeacher = bioText.praiserNames[randomIndex];

        agent.add(new Suggestion(`${person.name}'s teachers.`))
        agent.add(new Suggestion(`Who praised ${person.name}?`))
        if (randomTeacher)
            agent.add(new Suggestion(`Who is ${randomTeacher}?`))
    });
    // get teachers handler
    intentMap.set("get-teachers", async (agent) => {
        const query = agent.parameters.person as string;
        const person = await idb.queryForPerson(query);
        const teachers = (await idb.getTeachersAndStudentsOf(person.id)).filter(x => x.student.id === person.id);
        const uniqueteachers = Array.from(new Set(teachers.map(t => t.teacher.name)));
        if (teachers.length)
            agent.add(`${person.name}'s teachers include: ${uniqueteachers.join(", ")}`);
        else
            agent.add(`Sorry. There is currently no information on the teachers of ${person.name}.`);
    });
    // get students handler
    intentMap.set("get-students", async (agent) => {
        const query = agent.parameters.person as string;
        const person = await idb.queryForPerson(query);
        const students = (await idb.getTeachersAndStudentsOf(person.id)).filter(x => x.teacher.id === person.id);
        const uniquestudents = Array.from(new Set(students.map(t => t.student.name)));
        if (students.length)
            agent.add(`${person.name}'s learned from: ${uniquestudents.join(", ")}`);
        else
            agent.add(`Sorry. There is no currently information on the students of ${person.name}.`);
    });
    // get praisers handler
    intentMap.set("get-praisers", async (agent) => {
        const query = agent.parameters.person as string;
        const person = await idb.queryForPerson(query);
        const praisers = (await idb.getPraisersAndPraisesFor(person.id)).filter(x => x.praisee.id === person.id);
        const uniquepraisers = Array.from(new Set(praisers.map(t => t.praiser.name)));
        if (praisers.length)
            agent.add(`${person.name} was praised by: ${uniquepraisers.join(", ")}`);
        else
            agent.add(`Sorry. There is no currently information on who praised of ${person.name}.`);
    });
    // get praisees handler
    intentMap.set("get-praisees", async (agent) => {
        const query = agent.parameters.person as string;
        const person = await idb.queryForPerson(query);
        const praisees = (await idb.getPraisersAndPraisesFor(person.id)).filter(x => x.praiser.id === person.id);
        const uniquepraisees = Array.from(new Set(praisees.map(t => t.praisee.name)));
        if (praisees.length)
            agent.add(`${person.name} praised: ${uniquepraisees.join(", ")}`);
        else
            agent.add(`Sorry. There is no currently information who ${person.name} praised.`);
    });
    return mainAgent.handleRequest(intentMap);

    async function getPerson(agent: any) {
        const person = await idb.queryForPerson(agent.parameters.person);
        return person;
    }
});
