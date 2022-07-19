import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CdkVpcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'cdk-vpc', {
      cidr: '10.0.0.0/16',
      natGateways: 1,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'private-subnet-1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,
        },
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        }
      ]
    });

    const publicSg = new ec2.SecurityGroup(this, 'VPC-SG', {
      securityGroupName: 'CDK-VPC-SG',
      description: 'Custom CDK VPC SG, allow SSH/http',
      allowAllOutbound: true,
      vpc,
    });

    const connections = new ec2.Connections({
      securityGroups: [publicSg]
    });
    connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    connections.allowFromAnyIpv4(ec2.Port.tcp(80));
    connections.allowFromAnyIpv4(ec2.Port.tcp(443));

    const privateSg = new ec2.SecurityGroup(this, 'VPC-Priv-SG', {
      securityGroupName: 'CDK-VPC-Priv-SG',
      description: 'Custom CDK VPC Private SG, allow internal SSH',
      allowAllOutbound: true,
      vpc,
    });

    const privConnections = new ec2.Connections({
      securityGroups: [privateSg]
    });
    privConnections.allowFrom(publicSg, ec2.Port.tcp(22));
    privConnections.allowFrom(publicSg, ec2.Port.icmpPing());

    new ec2.Instance(this, 'PublicInstance', {
      vpc,
      vpcSubnets: {
        subnets: vpc.publicSubnets
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
        storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      }),
      keyName: process.env.key_pair_file_name,
      securityGroup: publicSg,
    });

    new ec2.Instance(this, 'PrivateInstance', {
      vpc,
      vpcSubnets: {
        subnets: vpc.privateSubnets
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
        storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      }),
      keyName: process.env.key_pair_file_name,
      securityGroup: privateSg,
    });

  };
};
