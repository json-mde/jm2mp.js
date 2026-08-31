/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file ESM Module for Interactive Example of Using JM2MP.JS in WWW.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

"use strict";
import * as JM2MP from 'https://cdn.jsdelivr.net/npm/@json-mde/jm2mp@1.0.0/+esm';

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

var source_editor = null;
var projection_editor = null;
var result_editor = null;

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It shows an `alert` dialog about the specified `error`.
 * @param {Error} error
 * The `error` to show.
 * @param {*} site
 * The site where the error is detected.
**/
function ShowError (error, site="")
{
    if(error instanceof Error)
    {
        const at = (site ? `at ${site}`:'');
        const message =`ERROR ${at}!\r\n${error.name} ${error.message}\r\n\r\n${error}`;
        if (result_editor) { result_editor.session.setValue(message); }
        else { alert(message); }
    }
}

/* ------------------------------------------------------------------ */

/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Project" action
 * button, using unobtrusive JavaScript technique.
**/
const InjectFunction_LoadCoursesAndStudentsExample = function ( id_button_for_load_example ) {
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_load_example = document.getElementById( id_button_for_load_example );
    if ( button_for_load_example )
    {
        button_for_load_example.addEventListener('click', async function SourceDocument_LoadCoursesAndStudentsExample__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            if ( source_editor )
            {
                try
                {
                    const example_source_file = await import("../examples/courses-students/source.json", { with: { type: "json" } });
                    const example_source_content = JSON.stringify(example_source_file.default,undefined,2);
                    source_editor.session.setValue(example_source_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadCoursesAndStudentsExample/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const example_projection_file = await import("../examples/courses-students/projection.json", { with: { type: "json" } });
                    const example_projection_content = JSON.stringify(example_projection_file.default,undefined,2);
                    projection_editor.session.setValue(example_projection_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadCoursesAndStudentsExample/projection');
                }
            }
            /* */
            if ( result_editor )
            {
                result_editor.session.setValue("");
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */

/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Project" action
 * button, using unobtrusive JavaScript technique.
**/
const InjectFunction_LoadInventoryExample = function ( id_button_for_load_example ) {
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_load_example = document.getElementById( id_button_for_load_example );
    if ( button_for_load_example )
    {
        button_for_load_example.addEventListener('click', async function SourceDocument_LoadInventoryExample__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            if ( source_editor )
            {
                try
                {
                    const example_source_file = await import("../examples/inventory/source.json", { with: { type: "json" } });
                    const example_source_content = JSON.stringify(example_source_file.default,undefined,2);
                    source_editor.session.setValue(example_source_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadInventoryExample/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const example_projection_file = await import("../examples/inventory/projection.json", { with: { type: "json" } });
                    const example_projection_content = JSON.stringify(example_projection_file.default,undefined,2);
                    projection_editor.session.setValue(example_projection_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadInventoryExample/projection');
                }
            }
            /* */
            if ( result_editor )
            {
                result_editor.session.setValue("");
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */


/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Validate" action
 * button, using unobtrusive JavaScript technique.
**/
const InjectValidationFunction = function (id_button_for_validation)
{
    //// alert( "Injecting validation event handler: " + id_button_for_validation + ".onclick" );
    let button_for_validation = document.getElementById( id_button_for_validation );
    if ( button_for_validation )
    {
        button_for_validation.addEventListener('click', async function ProjectionDocument_Validate__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            let source_document_object_model = null;
            let projection_object_model = null;
            /* */
            if ( source_editor )
            {
                try
                {
                    const source_document_json_text = source_editor.session.getValue();
                    source_document_object_model = JSON.parse( source_document_json_text );
                }
                catch
                {
                    ShowError(error, 'Validate/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const projection_json_text = projection_editor.session.getValue();
                    projection_object_model = JSON.parse( projection_json_text );
                }
                catch
                {
                    ShowError(error, 'Validate/projection');
                }
            }
            /* */
            if ( result_editor && source_document_object_model && projection_object_model )
            {
                try
                {
                    //
                    const rootName = "projection";
                    const loader = await JM2MP.createStringLoader(
                        { "projection" : JSON.stringify(projection_object_model) }
                    );
                    // When no registry is specified, a native-only wull be created.
                    const actualRegistry = await JM2MP.createAdapterRegistry();
                    // Stage 1/3: resolve and normalize modules.
                    const resolvedModule = await JM2MP.resolve(rootName, loader, {maxModules:1000,});
                    // Stage 2/3: validate the final module.
                    await JM2MP.validateModule(resolvedModule, actualRegistry);
                    result_editor.session.setValue("OK... projection is valid!");
                }
                catch ( error )
                {
                    ShowError(error, 'Validate/resultant');
                }
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */


/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Project" action
 * button, using unobtrusive JavaScript technique.
**/
const InjectProjectionFunction = function ( id_button_for_projection ) {
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_projection = document.getElementById( id_button_for_projection );
    if ( button_for_projection )
    {
        button_for_projection.addEventListener('click', async function ProjectionDocument_Project__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            let source_document_object_model = null;
            let projection_object_model = null;
            /* */
            if ( source_editor )
            {
                try
                {
                    const source_document_json_text = source_editor.session.getValue();
                    source_document_object_model = JSON.parse( source_document_json_text );
                }
                catch
                {
                    ShowError(error, 'Project/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const projection_json_text = projection_editor.session.getValue();
                    projection_object_model = JSON.parse( projection_json_text );
                }
                catch
                {
                    ShowError(error, 'Project/projection');
                }
            }
            /* */
            if ( result_editor && source_document_object_model && projection_object_model )
            {
                try
                {
                    const string_loader = await JM2MP.createStringLoader(
                        { "projection" : JSON.stringify(projection_object_model) }
                    );
                    const result_document_object_model = await JM2MP.project({
                            rootName: "projection",
                            loader: string_loader,
                            document: source_document_object_model,
                            registry: undefined,
                            options: {}
                    });
                    const result_document_json_text = JSON.stringify( result_document_object_model, undefined, 2 );
                    result_editor.session.setValue( result_document_json_text );
                }
                catch ( error )
                {
                    ShowError(error, 'Project/resultant');
                }
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */


/**
 * @description
 * Ace Cloud9 initialization.
 * @param {string} id_source_editor
 * The HtmlElement.ID of the _source document_ `Ace9` editor.
 * @param {string} id_projection_editor
 * The...
 * @param {string} id_result_editor
 * The...
 * @returns {boolean}
 * Always `false` to prevent default action (avoids navigation).
**/
function AceCloud9_Initialization( id_source_editor, id_projection_editor, id_result_editor )
{
    /* Source. */
    source_editor = ace.edit( id_source_editor );
    if ( source_editor )
    {
        source_editor.setTheme( "ace/theme/sqlserver" );
        source_editor.session.setMode( "ace/mode/json" );
        source_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        source_editor.setShowPrintMargin( true );
        source_editor.setHighlightActiveLine( true );
    }
    /* Projection. */
    projection_editor = ace.edit( id_projection_editor );
    if ( projection_editor )
    {
        projection_editor.setTheme( "ace/theme/sqlserver" );
        projection_editor.session.setMode( "ace/mode/json" );
        projection_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        projection_editor.setShowPrintMargin( true );
        projection_editor.setHighlightActiveLine( true );
    }
    /* Result. */
    result_editor = ace.edit( id_result_editor );
    if ( result_editor )
    {
        result_editor.setTheme( "ace/theme/sqlserver" );
        result_editor.session.setMode( "ace/mode/json" );
        result_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        result_editor.setShowPrintMargin( true );
        result_editor.setHighlightActiveLine( true );
    }
    /* It avoids any kind of navigation from just pressing this button. */
    return false;
}

/* ------------------------------------------------------------------ */


/***
 * Unobtrusive JavaScript for onLoad page's event.
***/
window.addEventListener('DOMContentLoaded', function() {
    //// alert("window.onload");
    /* */
    InjectFunction_LoadCoursesAndStudentsExample("SourceDocument_LoadCoursesAndStudentsExample");
    InjectFunction_LoadInventoryExample("SourceDocument_LoadInventoryExample");
    /* */
    InjectValidationFunction("ProjectionDocument_Validate");
    InjectProjectionFunction("ProjectionDocument_Project");
    /* */
    AceCloud9_Initialization("SourceDocument_ContentText",
                             "ProjectionDocument_ContentText",
                             "ResultDocument_ContentText");
});


/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: $/JM2MP.JS/index.js */
