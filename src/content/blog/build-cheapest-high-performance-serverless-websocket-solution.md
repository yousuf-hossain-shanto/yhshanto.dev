---
title: Build Cheapest High-Performance Serverless WebSocket Solution
excerpt: Discover how we crafted the cheapest, most efficient serverless WebSocket solution using AWS, capable of handling tens of thousands of users with ease!
publishDate: 'April 18 2024'
isFeatured: true
tags:
  - Web
  - AWS
  - Js
seo:
  description: Explore our journey in creating a cost-effective, scalable serverless WebSocket solution on AWS that supports high concurrency, security and performance.
  keywords: api gateway websocket, websocket api, websocket server, javascript websocket, nodejs websocket, websocket connection, websocket authentication, nodejs websocket server
  image:
    src: '/assets/build-cheapest-high-performance-serverless-websocket-solution/cover.png'
    alt: WebSocket and serverless icon on a yellow texture background
---

![WebSocket and serverless icon on a yellow texture background](/assets/build-cheapest-high-performance-serverless-websocket-solution/cover.png)

## Why Serverless?

Nowadays ServerLess is on hype. Everyone wants their service to deploy into ServerLess. Because scaling ServerLess deployment is easy for millions of users. And the bill is fairly simple. Pay ad per you use. BTW, it doesn't mean that ServerLess don't have server.

For many years, scaling WebSocket is being too tough. Even for thousand dollar WebSocket server, it crashes when at max 10k concurrent connections. Not every service is not this bad, there are some good WebSocket service out there. But they also expensive and it's still reasonable.

## Requirements

About two weeks ago, I was looking for a scalable WebSocket server solution for a website where it is very general to have 20k concurrent user. The authority wasn't interested to use long pulling and pusher service anymore. They want their very own solution. They also ready to pay any amount for this as they are very high profile USA client.

After the requirements analysis, what I found is...

1. WebSocket server needs to handle at least 20k concurrent connection and message broadcasting to everyone.

2. A connection can be able to subscribe to multiple channels and receive data from those channels like pusher service.

3. As the WebSocket Protocol doesn't support CORS protection like rest api, it will need some mechanics to authenticate and restrict connecting client origin.

4. The WebSocket server must be capable of broadcasting at least 2kb of data per minute.

5. The solution must be scalable to 100k concurrent user and so on.

6. Best security practices possible.

7. The solution must be open to customize anytime.

I have a good amount of experience working with the WebSocket and real time stuff. I have decided to go for AWS api gateway WebSocket service.

Planning to use AWS api gateway WebSocket, 4 lambda functions to handle connect, disconnect, broadcast and channel feature.

## Not Agreed?

You might tell this solution insane because the lambda service charges based on it's usages, and the bill will be millions for 20k concurrent WebSocket connections.

Let me clear your confusion. WebSocket connection is not maintained by the lambda. Client connection is going to be with the api gateway service which bill is near $0. Api gateway will proxy the request to lambda for the connect, disconnect and other routes as needed. So the lambda function will be used as needed comparatively very lower to the persistent WebSocket connection maintained by the api gateway service.

To save the channel info and persistent connection ids, started using DynamoDb.

## AWS Stack Template

It’s coding time, let’s code the solution. Checkout the below AWS **CloudFormation** template. I’ll explain later.

```yaml
Resources:
  Connections:
    Type: AWS::DynamoDB::Table
    Properties:
      KeySchema:
        - AttributeName: connectionId
          KeyType: HASH
        - AttributeName: channel
          KeyType: RANGE
      AttributeDefinitions:
        - AttributeName: connectionId
          AttributeType: S
        - AttributeName: channel
          AttributeType: S
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
    UpdateReplacePolicy: Delete
    DeletionPolicy: Delete
  ConnectHandlerServiceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  ConnectHandlerServiceRoleDefaultPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - dynamodb:BatchWriteItem
              - dynamodb:PutItem
              - dynamodb:UpdateItem
              - dynamodb:DeleteItem
              - dynamodb:DescribeTable
            Effect: Allow
            Resource:
              - Fn::GetAtt:
                  - Connections
                  - Arn
              - Ref: AWS::NoValue
        Version: "2012-10-17"
      PolicyName: ConnectHandlerServiceRoleDefaultPolicy
      Roles:
        - Ref: ConnectHandlerServiceRole
  ConnectHandler:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        ZipFile: |-
          const AWS = require('aws-sdk');
                const ddb = new AWS.DynamoDB.DocumentClient();
                exports.handler = async function (event, context) {
                  try {
                    await ddb
                      .put({
                        TableName: process.env.table,
                        Item: {
                          connectionId: event.requestContext.connectionId,
                          channel: 'default'
                        },
                      })
                      .promise();
                  } catch (err) {
                    return {
                      statusCode: 500,
                    };
                  }
                  return {
                    statusCode: 200,
                  };
                };
      Role:
        Fn::GetAtt:
          - ConnectHandlerServiceRole
          - Arn
      Environment:
        Variables:
          table:
            Ref: Connections
      Handler: index.handler
      Runtime: nodejs16.x
    DependsOn:
      - ConnectHandlerServiceRoleDefaultPolicy
      - ConnectHandlerServiceRole
  DisconnectHandlerServiceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  DisconnectHandlerServiceRoleDefaultPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - dynamodb:BatchWriteItem
              - dynamodb:PutItem
              - dynamodb:UpdateItem
              - dynamodb:DeleteItem
              - dynamodb:DescribeTable
              - dynamodb:BatchGetItem
              - dynamodb:GetRecords
              - dynamodb:GetShardIterator
              - dynamodb:Query
              - dynamodb:GetItem
              - dynamodb:Scan
              - dynamodb:ConditionCheckItem
            Effect: Allow
            Resource:
              - Fn::GetAtt:
                  - Connections
                  - Arn
              - Ref: AWS::NoValue
        Version: "2012-10-17"
      PolicyName: DisconnectHandlerServiceRoleDefaultPolicy
      Roles:
        - Ref: DisconnectHandlerServiceRole
  DisconnectHandler:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        ZipFile: |-
          const AWS = require('aws-sdk');
                const ddb = new AWS.DynamoDB.DocumentClient();

                exports.handler = async function (event, context) {
                  try {
                    const rowsResult = await ddb.scan({
                      TableName: process.env.table,
                      FilterExpression: 'connectionId = :connectionId',
                      ExpressionAttributeValues: {
                          ":connectionId": event.requestContext.connectionId
                      }
                    }).promise();
                                        
                    const deleteableItems = rowsResult.Items.map(({ connectionId, channel }) => ({
                      DeleteRequest: {
                        Key: {
                          connectionId,
                          channel
                        }
                      }
                    }))
                    
                    if (deleteableItems.length) {
                      await ddb.batchWrite({
                        RequestItems: {
                          [process.env.table]: deleteableItems,
                        }
                      }).promise();
                    }
                    
                    return {
                      statusCode: 200
                    }
                  } catch (err) {
                    console.log(err)
                    return {
                      statusCode: 500,
                    };
                  }
                };
      Role:
        Fn::GetAtt:
          - DisconnectHandlerServiceRole
          - Arn
      Environment:
        Variables:
          table:
            Ref: Connections
      Handler: index.handler
      Runtime: nodejs16.x
    DependsOn:
      - DisconnectHandlerServiceRoleDefaultPolicy
      - DisconnectHandlerServiceRole
  SendMessageHandlerServiceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  SendMessageHandlerServiceRoleDefaultPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - dynamodb:BatchGetItem
              - dynamodb:GetRecords
              - dynamodb:GetShardIterator
              - dynamodb:Query
              - dynamodb:GetItem
              - dynamodb:Scan
              - dynamodb:ConditionCheckItem
              - dynamodb:DescribeTable
            Effect: Allow
            Resource:
              - Fn::GetAtt:
                  - Connections
                  - Arn
              - Ref: AWS::NoValue
        Version: "2012-10-17"
      PolicyName: SendMessageHandlerServiceRoleDefaultPolicy
      Roles:
        - Ref: SendMessageHandlerServiceRole
  SendMessageHandler:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        ZipFile: |-
          const AWS = require('aws-sdk');
                const ddb = new AWS.DynamoDB.DocumentClient();

                exports.handler = async function (event, context) {
                  const body = JSON.parse(event.body)
                  const message = body.message;
                  const channel = body.channel??'default';
                  
                  let connections;
                  try {
                    connections = await ddb.scan({
                      TableName: process.env.table,
                      FilterExpression: 'channel = :channelId',
                      ExpressionAttributeValues: {
                          ":channelId": channel
                      }
                    }).promise();
                  } catch (err) {
                    console.log(err)
                    return {
                      statusCode: 500,
                    };
                  }
                  const callbackAPI = new AWS.ApiGatewayManagementApi({
                    apiVersion: '2018-11-29',
                    endpoint:
                      event.requestContext.domainName + '/' + event.requestContext.stage,
                  });

                  const sendMessages = connections.Items.map(async ({ connectionId }) => {
                    if (connectionId !== event.requestContext.connectionId) {
                      try {
                        await callbackAPI
                          .postToConnection({ ConnectionId: connectionId, Data: message })
                          .promise();
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  });

                  try {
                    await Promise.allSettled(sendMessages);
                  } catch (e) {
                    console.log(e);
                    return {
                      statusCode: 500,
                    };
                  }

                  return { statusCode: 200 };
                };
      Role:
        Fn::GetAtt:
          - SendMessageHandlerServiceRole
          - Arn
      Environment:
        Variables:
          table:
            Ref: Connections
      Handler: index.handler
      Runtime: nodejs16.x
    DependsOn:
      - SendMessageHandlerServiceRoleDefaultPolicy
      - SendMessageHandlerServiceRole
  JoinChannelHandlerServiceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Action: sts:AssumeRole
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
        Version: "2012-10-17"
      ManagedPolicyArns:
        - Fn::Join:
            - ""
            - - "arn:"
              - Ref: AWS::Partition
              - :iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  JoinChannelHandlerServiceRoleDefaultPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action:
              - dynamodb:BatchWriteItem
              - dynamodb:PutItem
              - dynamodb:UpdateItem
              - dynamodb:DeleteItem
              - dynamodb:DescribeTable
              - dynamodb:BatchGetItem
              - dynamodb:GetRecords
              - dynamodb:GetShardIterator
              - dynamodb:Query
              - dynamodb:GetItem
              - dynamodb:Scan
              - dynamodb:ConditionCheckItem
            Effect: Allow
            Resource:
              - Fn::GetAtt:
                  - Connections
                  - Arn
              - Ref: AWS::NoValue
        Version: "2012-10-17"
      PolicyName: JoinChannelHandlerServiceRoleDefaultPolicy
      Roles:
        - Ref: JoinChannelHandlerServiceRole
  JoinChannelHandler:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        ZipFile: |-
          const AWS = require('aws-sdk');
                const ddb = new AWS.DynamoDB.DocumentClient();

                exports.handler = async function (event, context) {
                  try {
                    const channel = JSON.parse(event.body).channel;
                    if (! channel.length) throw new Error("Channel Id is required")
                    
                    await ddb
                      .put({
                        TableName: process.env.table,
                        Item: {
                          connectionId: event.requestContext.connectionId,
                          channel
                        },
                      })
                      .promise();
                      
                    const callbackAPI = new AWS.ApiGatewayManagementApi({
                      apiVersion: '2018-11-29',
                      endpoint:
                        event.requestContext.domainName + '/' + event.requestContext.stage,
                    });
                    
                    try {
                      await callbackAPI.postToConnection({ ConnectionId: event.requestContext.connectionId, Data: JSON.stringify({
                        channel,
                        connectionId: event.requestContext.connectionId
                      }) }).promise();
                    } catch (e) {}
                    
                  } catch (err) {
                    console.log(err)
                    return {
                      statusCode: 500,
                    };
                  }
                  return {
                    statusCode: 200,
                  };
                };
      Role:
        Fn::GetAtt:
          - JoinChannelHandlerServiceRole
          - Arn
      Environment:
        Variables:
          table:
            Ref: Connections
      Handler: index.handler
      Runtime: nodejs16.x
    DependsOn:
      - JoinChannelHandlerServiceRoleDefaultPolicy
      - JoinChannelHandlerServiceRole
  ManageConnections:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Action: execute-api:ManageConnections
            Effect: Allow
            Resource:
              Fn::Join:
                - ""
                - - "arn:aws:execute-api:"
                  - Ref: AWS::Region
                  - ":"
                  - Ref: AWS::AccountId
                  - ":"
                  - "*/*/POST/@connections/*"
        Version: "2012-10-17"
      PolicyName: ManageConnections
      Roles:
        - Ref: SendMessageHandlerServiceRole
        - Ref: JoinChannelHandlerServiceRole

```

## Configure & Install

To use this template, 

1. Create a **YAML** file named like `api-gateway-websocket.yaml` . Copy the above code block and paste into the YAML file.
2. Login to your [AWS console](https://aws.amazon.com/console) account. Search for [CloudFormation Stacks](https://us-east-1.console.aws.amazon.com/cloudformation/home). Click on **Create Stack** with new resources (standard).
    1. Configure settings like below image
        
        ![AWS Console Create Stack page screenshot with arrow messages defining steps](/assets/build-cheapest-high-performance-serverless-websocket-solution/create-stack.webp)
        
    2. Upload the previously saved **API Gateway WebSocket** YAML file using the uploader shown in arrow 3
    3. Provide a stack name and keep the rest of the thing as it is by default. Review and create stack and wait for it to complete.
3. When the stack will be completed, you will need to create a AWS **API Gateway WebSocket** service.
    1. Navigate to [API Gateway](https://aws.amazon.com/api-gateway/) and click on **create** api. Click **Build** button into **WebSocket API** card.
    2. Provide the api a name and `request.body.action` in **Route selection expression** input.
    3. On **Add Routes** screen, add `$connect`, `$disconnect` from predefined routes, and add `sendmessage`, `joinchannel` keys to create 2 more custom routes. Click Next.
    4. On Attach Integration screen, select lambda for integration type for all the routes. Search and select “ConnectHandler” function for $connect, “DisconnectHandler” for $disconnect, “SendMessageHandler” for `sendmessage` route and “JoinChannelHandler” for `joinchannel` route.
    5. Add a stage like `dev` or `production` whatever you want to name.
    6. Review and create. After the deployment, you will get a WebSocket endpoint starting with `wss://*` like that. Copy the WebSocket url and try connecting through [PieHost](https://piehost.com/websocket-tester). You can also test using `wscat` cli tool. Use this command `wscat -c wss://your-api-gateway-websocket-url`

## Usages

Let me show you how to make a WebSocket connection with the URL. I’ll use javascript WebSocket connection method in browser and NodeJs WebSocket connection method by using [Reconnecting WebSocket](https://www.npmjs.com/package/reconnecting-websocket) using same codebase. Checkout below code.

```jsx
const airportRws = new ReconnectingWebSocket(
  "wss://abcdefg.execute-api.us-east-1.amazonaws.com/dev"
);
airportRws.onopen = (e) => {
	// you will be able to join multiple channel and wait for the messages
  airportRws.send(
    JSON.stringify({
      action: "joinchannel",
      channel: "friends-channel", // your channel name
    })
  );
  airportRws.send(
    JSON.stringify({
      action: "joinchannel",
      channel: "family-channel",
    })
  );
  airportRws.send(
    JSON.stringify({
      action: "sendmessage",
      channel: "friends-channel",
      message: "Hello, everyone",
    })
  ); // this will broadcast your joining message to everyone already connected with this channel
};
airportRws.onclose = (e) => {
  console.log("Websocket close", e);
};
airportRws.onerror = (e) => {
  console.log("Websocket error", e);
};
airportRws.onmessage = (e) => {
  const message = e.data;
  const channel = e.channel;
  console.log("Channel", parsed.channel)
  console.log("Message", parsed)
};
```

By using above code, you will be able to connect to this WebSocket from browser as well as from NodeJs/NextJs server.

## Conclusion

I didn’t include authorization and authentication mechanism into this guide intensionally. Because it will depend how you want to implement those functions. If you need to know how I had implemented those functions, comment down below or directly [reach out to me](https://yhshanto.dev/contact/). If you like this post hit the like button, if you unlike it, hit unlike. Feel free to comment and subscribe to my newsletter down below the [original post](https://yhshanto.dev/blog/build-cheapest-high-performance-serverless-websocket-solution/) page.
