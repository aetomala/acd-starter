# Getting started with Node.js on Bluemix
By following this guide, you'll set up a development environment, deploy an app locally and on Bluemix, and integrate a Watson Advanced Annotator Data service in your app.

## Prerequisites

You'll need a [Bluemix account](https://console.ng.bluemix.net/registration/), [Git](https://git-scm.com/downloads) [Cloud Foundry CLI](https://github.com/cloudfoundry/cli#downloads) and [Node](https://nodejs.org/en/)

## 1. Clone the sample app

Now you're ready to start working with the simple Node.js *hello world* app. Clone the repository and change to the directory to where the sample app is located.
  ```
  git clone https://sbybz2177.sby.ibm.com/whc-elephant-api-platform/acd-demo
  ```

  ```
  cd acd-demo
  ```

  Peruse the files in the *acd-demo* directory to familiarize yourself with the contents.

## 2. Run the app locally

Install the dependencies listed in the [package.json](https://docs.npmjs.com/files/package.json) file to run the app locally.  
  ```
  npm install
  ```

Run the app.
  ```
  npm start  
  ```

View your app at: http://localhost:3000

## 3. Prepare the app for deployment

To deploy to Bluemix, it can be helpful to set up a manifest.yml file. One is provided for you with the sample. Take a moment to look at it.

The manifest.yml includes basic information about your app, such as the name, how much memory to allocate for each instance and the route. In this manifest.yml **random-route: true** generates a random route for your app to prevent your route from colliding with others.  You can replace **random-route: true** with **host: myChosenHostName**, supplying a host name of your choice. [Learn more...](https://console.bluemix.net/docs/manageapps/depapps.html#appmanifest)
 ```
 applications:
  - name: acd-demo-application
    host: acd-demo-application
    instances: 1
    memory: 128M
    disk_quota: 1024M
    random-route: true
    buildpack: sdk-for-nodejs
 ```

## 4. Deploy the app

You can use the Cloud Foundry CLI to deploy apps.

Choose your API endpoint
   ```
   cf api <API-endpoint>
   ```

Replace the *API-endpoint* in the command with an API endpoint from the following list.
  ```
  https://api.ng.bluemix.net # US South
  https://api.eu-gb.bluemix.net # United Kingdom
  https://api.au-syd.bluemix.net # Sydney
  ```

Login to your Bluemix account

  ```
  cf login
  ```

From within the *nodejs-helloworld* directory push your app to Bluemix
  ```
  cf push
  ```

This can take a minute. If there is an error in the deployment process you can use the command `cf logs <Your-App-Name> --recent` to troubleshoot.


View your app at the URL listed in the output of the push command, for example, *myUrl.mybluemix.net*.  You can issue the
```
cf apps
```
command to view your apps status and see the URL.


## 5. Add an Advanced Annotator Data service

Next, we'll add an ACD service to this application and set up the application so that it can run on Bluemix.

1. Log in to Bluemix in your Browser. Select your application and click on `Connect new` under `Connections`.
2. Select `Advanced Annotator Data` and Create the service.
3. Select `Restage` when prompted. Bluemix will restart your application and provide the service credentials to your application using the `VCAP_SERVICES` environment variable. This environment variable is only available to the application when it is running on Bluemix.


## 6. Add user defined variables

Because this application can work with multiple acd service registration, you will need to create a user defined variable to indicate to the application which service you will be testing.

1. Log in to Bluemix in your Browser. Select your application and click on `Runtime`
2. Select `Environment variables` and scroll down to the User defined area
3. Enter `SERVICE_NAME` in the name column and enter the name of your service broker in the value column.  For example advanced_annotator_data.dev
4. Click on save

## 7. Use the Advanced Annotator Data service

We're now going to update your local code to point to an instance of ACD. We'll create a json file that will store the credentials for the services the application will use. This file will get used ONLY when the application is running locally. When running in Bluemix, the credentials will be read from the VCAP_SERVICES environment variable.

1. Create a file called `vcap-local.json` in the `acd-demo` directory with the following content:
  ```
  {
    "services": {
      "acd-default": [
      {
        "credentials": {
          "url": "https://watsonpow01.rch.stglabs.ibm.com/services/advanced_care_insights/api/v1",
          "username": "whateverworks",
          "password": "whateverworks"
        },
        "syslog_drain_url": null,
        "label": "advanced_annotator_data.dev",
        "provider": null,
        "plan": "experimental",
        "name": "ACD-01",
        "tags": [
          "watson",
          "ibm_created",
          "ibm_experimental"
        ]
      }
    ]
    }
  }
  ```

2. Run your application locally.
  ```
  npm start  
  ```

  View your app at: http://localhost:3000.

  Tip: Use [nodemon](https://nodemon.io/) to automatically restart the application when you update code.

5. Make any changes you want and re-deploy to Bluemix!
  ```
  cf push
  ```
