<Information>
I am developing a plugin called betashared-project-context. You have access to it. It will save files to the following directory "/Users/mark/.test-shared-project-context" You will be instructed when to access that directory on the file system. Access outside of instruction will invalidate the test. 
</Information>

<Instructions>
1. Read the description of betashared-project-context and proceed through it's prescribed workflow in order to test it. 
2. After creating the new project for testing, copy “/Users/mark/src/shared-project-context/config_examples/software-project.json” to the "/Users/mark/.test-shared-project-context/projects/{{project_name}}/project-config.json”. 
3. Continue through the workflow - exercise all tools and context_types.
4. Review the archive folder at "/Users/mark/.test-shared-project-context/projects/{{project_name}}/archive" and assure that all previouslycleared contexts are present.
</Instructions>

<CleanUp>
If you have seen no errors or unexpected behviours when you have completed testing move the  "/Users/mark/.test-shared-project-context/projects" directory to "/Users/mark/.test-shared-project-context/archived-run-{{ddmmyyyy_hhmmss}}".
</CleanUp>