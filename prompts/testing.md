<Information>
    I am developing a plugin called betashared-project-context. You have access to it. It will save files to the following directory "/Users/mark/.test-shared-project-context" You will be instructed when to access that directory on the file system. Access outside of instruction will invalidate the test. 
</Information>

<TestResultFormat>
    {
        "success": boolean, // IMPORTANT:false if any test case fails.
        "test_cases": {
            endpoint_results": {
                "create_project": boolean,
                "list_projects": boolean,
                "get_context": boolean,
                "write_context": boolean,
                "get_template": boolean,
                "clear_context": boolean
                "delete_project": boolean   
            },
            "template_validation": boolean,
            "archive_success": boolean,
            
        },
        "errors": Array<{
            component: string,  // e.g. create_project, context_type, validation, archive
            failure_description: text,
            prompt_to_reproduce: text
            }>,
        "cleanup_result": boolean,
        "additional_notes": text //  IMPORTANT: This is NOT a summary. ONLY include additional notes if there are unexpected behaviors or concerns.  "" in all other cases.
    }
</TestResultFormat>

<Instructions>
    1. Read the description of betashared-project-context and proceed through it's prescribed workflow in order to test it. 
    2. After creating the new project for testing, copy “/Users/mark/src/shared-project-context/config_examples/software-project.json” to the "/Users/mark/.test-shared-project-context/projects/{{project_name}}/project-config.json”. 
    3. Continue through the workflow - exercise all tools and context_types.
    4. Confirm that templated contextTypes fail validation when malformed.
    5. Review the archive folder at "/Users/mark/.test-shared-project-context/projects/{{project_name}}/archive" and assure that all previously cleared contexts are present.
    6. Write the test results into "/Users/mark/.test-shared-project-context/projects/{{project_name}}/result.json" in the format specified in <TestResultFormat>.
    7. Return the test results as a codeblock with the language "json" in the format specified in <TestResultFormat>.
</Instructions>

<CleanUp>
    If you have seen no errors or unexpected behaviors when you have completed testing move the  "/Users/mark/.test-shared-project-context/projects" directory to "/Users/mark/.test-shared-project-context/archived-run-{{ddmmyyyy_hhmmss}}".
</CleanUp>