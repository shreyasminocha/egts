![Microsoft Defending Democracy Program: ElectionGuard Python][banner image]

# 🗳 ETS: ElectionGuard Typescript


[banner image]: https://raw.githubusercontent.com/microsoft/electionguard-python/main/images/electionguard-banner.svg


## ❓ What Is Vote-by-mail?
 Vote by mail, or vote at home, is a method of voting that voters get their ballot delivered to them weeks before Election Day, fill it out at their convenience, then return it either in-person or by mail. There are two types of vote by mail system -- comprehensive vote by mail and absentee ballots. To ensure the integrity of elections and the validity of each ballot, risk-limiting audits are implemented and ballot tracking services are provided.

## ❓ What Is End-to-End Verifiable Voting?
 E2E verifiable voting is a way to guarantee voting system security, preventing someone other than the sender or recipient from accessing & modifying the ballots. The voters first vote the way they would traditionally on an electronic voting system, but in the end, an e2e system would use cryptography and generate a receipt of a long numeric sequence or a qrcode. This receipt is essentially a record of the vote that's been encrypted with a secret key the voter doesn't have. But it still allows voters to verify that their votes were counted. E2E verifiable voting is able to respond to voters' challenge on whether their ballots are included by providing mathematical proofs which show that the ballots add up to the officially announced totals.  That is the mechanism of how the voters can get confident evidence of their ballot being effective without revealing which candidates were voted for nor requiring them to trust election official results, software, hardware, and so on.


## ❓ What Is ElectionGuard?
ElectionGuard is an open source software development kit (SDK) that makes voting more secure, transparent and accessible. The ElectionGuard SDK leverages homomorphic encryption to ensure that votes recorded by electronic systems of any type remain encrypted, secure, and secret. Meanwhile, ElectionGuard also allows verifiable and accurate tallying of ballots by any 3rd party organization without compromising secrecy or security.

## ❗️Here comes Electionguard Typescript!
Our team focuses on building a bridge between the vote-by-mail system and end-to-end verifiable encryption. We want to create a user-friendly web application that not only allows user to vote and print out their ballot, but also performs chaum Peterson encryption while they are voting. This is actually an in-browser version of election guard. 

To achieve this, for Microsoft team, we built a typescript frontend implementation that uses the exactly same encryption logic as election guard. For Front end web interface, we built a fully encapsulated API to add the feature of ballot encryption for them. You can just use approximately few lines of code that calls encrpt_ballot in the front-end typescript, and we will handle everything else for you. 

## Workflow of ETS:
Data pipeline:
![workflow of ETS](README_src/workflow.png)

### Getting Started

```bash
# Install dependencies
npm install

# Now you can run various npm commands:
npm run test
npm run elgamal-bench
...

# Auto-indenter and linter (uses gts)
npm run fix
```


### Documentation, published with CI

You can auto-generate API documentation from the TypeScript source files using [TypeDoc](https://typedoc.org/guides/doccomments/). The generated documentation can be published to GitHub / GitLab pages through the CI.

```bash
npm run docs
```

The resulting HTML is saved in `docs/`.

You can publish the documentation through CI:
* [GitHub pages](https://pages.github.com/): See [`.github/workflows/deploy-gh-pages.yml`](https://github.com/metachris/typescript-boilerplate/blob/master/.github/workflows/deploy-gh-pages.yml)
* [GitLab pages](https://docs.gitlab.com/ee/user/project/pages/): [`.gitlab-ci.yml`](https://github.com/metachris/typescript-boilerplate/blob/master/.gitlab-ci.yml)

This is the documentation for this boilerplate project: https://metachris.github.io/typescript-boilerplate/

## Authors
- Han Guo <alexiland@outlook.com>
- Xin Hao <xinhaofighting@gmail.com>
- Shreyas Minocha <shreyasminocha@rice.edu>
- Dan S. Wallach <dwallach@rice.edu> or <dwallach@gmail.com>
- Arthur Wu <wuwenqin200613@gmail.com>
- Yanyu Zhong <yanyuzhongzyy@gmail.com>
- Zihe Zhao <zz83@rice.edu>