import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as lambda from 'aws-cdk-lib/aws-lambda'

export class AwsProxyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const webSocketApi = new apigwv2.WebSocketApi(this, 'WebSocketApi')

    new apigwv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi,
      stageName: 'dev',
    })

    const nodejsFunction = new lambdaNodejs.NodejsFunction(this, 'NodejsFunction', {
      entry: 'src/index.ts',
      runtime: lambda.Runtime.NODEJS_20_X,
    })

    webSocketApi.addRoute('$default', {
      integration: new apigwv2Integrations.WebSocketLambdaIntegration(
        'WebSocketLambdaIntegration',
        nodejsFunction,
        {
          contentHandling: apigwv2.ContentHandling.CONVERT_TO_BINARY,
        }
      ),
    })
  }
}
